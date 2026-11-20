import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  BoxRequest,
  BoxResponse,
  CableAttachmentRequest,
  CableAttachmentResponse,
  CableRequest,
  CableResponse,
  CoordinateDto,
  CustomerRequest,
  CustomerResponse,
  OltRequest,
  OltResponse,
} from '../api/api-types';
import { toCoordinate, toCoordinates } from '../api/coordinates';
import { BoxApi } from '../api/resources/box-api';
import { CableApi } from '../api/resources/cable-api';
import { CustomerApi } from '../api/resources/customer-api';
import { OltApi } from '../api/resources/olt-api';
import { GeoPoint } from '../models/geo.model';
import { NotificationService } from '../services/notification';
import {
  MapCable,
  MapElement,
  boxToElement,
  cableToMapCable,
  customerToElement,
  oltToElement,
} from './map-element';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Referência a um elemento que pode estar na lista de elementos de um cabo. */
export interface ElementRef {
  kind: 'olt' | 'box';
  id: string;
}

export interface CableEndpoints {
  start?: ElementRef;
  end?: ElementRef;
}

export interface CreateCableResult {
  cable: CableResponse;
  /** `true` gravou início/fim; `false` falhou; `null` não tentou (faltou início ou fim). */
  attachmentsSaved: boolean | null;
}

interface Identified {
  id?: string;
}

/**
 * Único ponto em que o mapa fala com a API: carrega OLTs, caixas, clientes e cabos
 * e aplica as escritas. Criar/editar/excluir mudam o estado só após a resposta;
 * arrastar muda na hora e volta atrás se o servidor recusar.
 */
@Injectable({ providedIn: 'root' })
export class NetworkMapRepository {
  private readonly oltApi = inject(OltApi);
  private readonly boxApi = inject(BoxApi);
  private readonly cableApi = inject(CableApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly notifications = inject(NotificationService);

  private readonly _loadState = signal<LoadState>('idle');
  private readonly _olts = signal<readonly OltResponse[]>([]);
  private readonly _boxes = signal<readonly BoxResponse[]>([]);
  private readonly _customers = signal<readonly CustomerResponse[]>([]);
  private readonly _cables = signal<readonly CableResponse[]>([]);

  readonly loadState = this._loadState.asReadonly();
  readonly olts = this._olts.asReadonly();
  readonly boxes = this._boxes.asReadonly();
  readonly customers = this._customers.asReadonly();
  readonly cables = this._cables.asReadonly();

  readonly elements = computed<readonly MapElement[]>(() =>
    [
      ...this._olts().map(oltToElement),
      ...this._boxes().map(boxToElement),
      ...this._customers().map(customerToElement),
    ].filter((element): element is MapElement => element !== null),
  );

  readonly mapCables = computed<readonly MapCable[]>(() =>
    this._cables()
      .map(cableToMapCable)
      .filter((cable): cable is MapCable => cable !== null),
  );

  load(): void {
    this._loadState.set('loading');
    forkJoin({
      olts: this.oltApi.list(),
      boxes: this.boxApi.list(),
      customers: this.customerApi.list(),
      cables: this.cableApi.list(),
    }).subscribe({
      next: (data) => {
        this._olts.set(data.olts);
        this._boxes.set(data.boxes);
        this._customers.set(data.customers);
        this._cables.set(data.cables);
        this._loadState.set('ready');
      },
      error: () => this._loadState.set('error'),
    });
  }

  findOlt(id: string): OltResponse | undefined {
    return this._olts().find((item) => item.id === id);
  }

  findBox(id: string): BoxResponse | undefined {
    return this._boxes().find((item) => item.id === id);
  }

  findCable(id: string): CableResponse | undefined {
    return this._cables().find((item) => item.id === id);
  }

  // OLTs

  createOlt(body: OltRequest): Observable<OltResponse> {
    return this.oltApi
      .create(body)
      .pipe(tap((created) => this._olts.update((list) => [...list, created])));
  }

  updateOlt(id: string, body: OltRequest): Observable<OltResponse> {
    return this.oltApi
      .update(id, body)
      .pipe(tap((saved) => this._olts.update((list) => replace(list, saved))));
  }

  deleteOlt(id: string): Observable<void> {
    return this.oltApi.delete(id).pipe(tap(() => this._olts.update((list) => remove(list, id))));
  }

  // Caixas

  createBox(body: BoxRequest): Observable<BoxResponse> {
    return this.boxApi
      .create(body)
      .pipe(tap((created) => this._boxes.update((list) => [...list, created])));
  }

  updateBox(id: string, body: BoxRequest): Observable<BoxResponse> {
    return this.boxApi
      .update(id, body)
      .pipe(tap((saved) => this._boxes.update((list) => replace(list, saved))));
  }

  deleteBox(id: string): Observable<void> {
    return this.boxApi.delete(id).pipe(tap(() => this._boxes.update((list) => remove(list, id))));
  }

  // Clientes

  findCustomer(id: string): CustomerResponse | undefined {
    return this._customers().find((item) => item.id === id);
  }

  createCustomer(body: CustomerRequest): Observable<CustomerResponse> {
    return this.customerApi
      .create(body)
      .pipe(tap((created) => this._customers.update((list) => [...list, created])));
  }

  updateCustomer(id: string, body: CustomerRequest): Observable<CustomerResponse> {
    return this.customerApi
      .update(id, body)
      .pipe(tap((saved) => this._customers.update((list) => replace(list, saved))));
  }

  deleteCustomer(id: string): Observable<void> {
    return this.customerApi
      .delete(id)
      .pipe(tap(() => this._customers.update((list) => remove(list, id))));
  }

  // Cabos

  createCable(body: CableRequest, endpoints: CableEndpoints): Observable<CreateCableResult> {
    return this.cableApi.create(body).pipe(
      tap((created) => this._cables.update((list) => [...list, created])),
      switchMap((cable) => {
        const { start, end } = endpoints;
        if (!start || !end || !cable.id) {
          return of<CreateCableResult>({ cable, attachmentsSaved: null });
        }
        const attachments: CableAttachmentRequest[] = [
          attachment('START', start),
          attachment('END', end),
        ];
        return this.cableApi.setAttachments(cable.id, attachments).pipe(
          map((): CreateCableResult => ({ cable, attachmentsSaved: true })),
          catchError(() => of<CreateCableResult>({ cable, attachmentsSaved: false })),
        );
      }),
    );
  }

  updateCable(id: string, body: CableRequest): Observable<CableResponse> {
    return this.cableApi
      .update(id, body)
      .pipe(tap((saved) => this._cables.update((list) => replace(list, saved))));
  }

  deleteCable(id: string): Observable<void> {
    return this.cableApi
      .delete(id)
      .pipe(tap(() => this._cables.update((list) => remove(list, id))));
  }

  attachments(cableId: string): Observable<CableAttachmentResponse[]> {
    return this.cableApi.listAttachments(cableId);
  }

  // Arrastos (otimistas)

  moveElement(ref: ElementRef, position: GeoPoint): void {
    const location = toCoordinate(position);
    if (ref.kind === 'olt') {
      const current = this.findOlt(ref.id);
      if (!current) {
        return;
      }
      this.optimistic(
        this._olts,
        current,
        { ...current, location },
        (item) => sameCoordinate(item.location, location),
        (next) => this.oltApi.update(ref.id, toOltRequest(next)),
      );
      return;
    }
    const current = this.findBox(ref.id);
    if (!current) {
      return;
    }
    this.optimistic(
      this._boxes,
      current,
      { ...current, location },
      (item) => sameCoordinate(item.location, location),
      (next) => this.boxApi.update(ref.id, toBoxRequest(next)),
    );
  }

  updateCableRoute(id: string, points: readonly GeoPoint[]): void {
    const current = this.findCable(id);
    if (!current) {
      return;
    }
    const coordinates = toCoordinates(points);
    this.optimistic(
      this._cables,
      current,
      { ...current, coordinates },
      (item) => sameRoute(item.coordinates, coordinates),
      (next) => this.cableApi.update(id, toCableRequest(next)),
    );
  }

  /**
   * Aplica `next` na hora e envia ao servidor. A resposta (ou a volta ao valor anterior)
   * só é aplicada se o item ainda estiver como este arrasto o deixou — assim um arrasto
   * mais novo nunca é desfeito por um mais antigo.
   */
  private optimistic<T extends Identified>(
    store: ReturnType<typeof signal<readonly T[]>>,
    previous: T,
    next: T,
    stillMine: (item: T) => boolean,
    send: (next: T) => Observable<T>,
  ): void {
    store.update((list) => replace(list, next));
    const isUntouched = () => {
      const item = store().find((candidate) => candidate.id === next.id);
      return item !== undefined && stillMine(item);
    };
    send(next).subscribe({
      next: (saved) => {
        if (isUntouched()) {
          store.update((list) => replace(list, saved));
        }
      },
      error: (error: unknown) => {
        if (isUntouched()) {
          store.update((list) => replace(list, previous));
        }
        this.notifications.apiError(error);
      },
    });
  }
}

function replace<T extends Identified>(list: readonly T[], item: T): T[] {
  return list.map((current) => (current.id === item.id ? item : current));
}

function remove<T extends Identified>(list: readonly T[], id: string): T[] {
  return list.filter((current) => current.id !== id);
}

function attachment(role: 'START' | 'END', ref: ElementRef): CableAttachmentRequest {
  return ref.kind === 'olt' ? { role, oltId: ref.id } : { role, boxId: ref.id };
}

function sameCoordinate(a: CoordinateDto | undefined, b: CoordinateDto): boolean {
  return a !== undefined && a.longitude === b.longitude && a.latitude === b.latitude;
}

function sameRoute(a: readonly CoordinateDto[] | undefined, b: readonly CoordinateDto[]): boolean {
  return (
    a !== undefined && a.length === b.length && a.every((point, i) => sameCoordinate(point, b[i]))
  );
}

function toOltRequest(olt: OltResponse): OltRequest {
  return {
    name: olt.name ?? '',
    description: olt.description,
    usageStatus: olt.usageStatus,
    model: olt.model,
    location: olt.location!,
  };
}

function toBoxRequest(box: BoxResponse): BoxRequest {
  return {
    name: box.name ?? '',
    description: box.description,
    type: box.type!,
    usageStatus: box.usageStatus,
    powerCapacity: box.powerCapacity,
    trayCapacity: box.trayCapacity,
    manufacturer: box.manufacturer,
    model: box.model,
    address: box.address,
    location: box.location!,
  };
}

function toCableRequest(cable: CableResponse): CableRequest {
  return {
    name: cable.name ?? '',
    description: cable.description,
    role: cable.role!,
    usageStatus: cable.usageStatus,
    manufacturer: cable.manufacturer,
    model: cable.model,
    fiberCapacity: cable.fiberCapacity ?? 0,
    coordinates: cable.coordinates ?? [],
  };
}
