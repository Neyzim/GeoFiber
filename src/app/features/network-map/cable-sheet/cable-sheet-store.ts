import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  CableAttachmentResponse,
  CableFiberResponse,
  FiberStatus,
  LooseTubeResponse,
} from '../../../core/api/api-types';
import { CableApi } from '../../../core/api/resources/cable-api';
import { FiberApi } from '../../../core/api/resources/fiber-api';
import {
  RouteItem,
  describeCableRoute,
  toAttachmentRequests,
  toRouteItems,
  validateRoute,
} from '../../../core/network/cable-route';
import { planStructure } from '../../../core/network/optical-catalog';
import { NotificationService } from '../../../core/services/notification';

export type SheetState = 'idle' | 'loading' | 'ready' | 'error';

/** Um tubo do cabo com as suas fibras, em ordem. */
export interface TubeView {
  id: string;
  tubeNumber: number;
  capacity: number;
  color: LooseTubeResponse['color'];
  fibers: CableFiberResponse[];
}

/**
 * Estado da ficha do cabo aberto: lista de elementos (com edição), tubos e fibras.
 * Provido pela página do mapa; só aplica respostas do cabo que ainda está aberto.
 */
@Injectable()
export class CableSheetStore {
  private readonly cableApi = inject(CableApi);
  private readonly fiberApi = inject(FiberApi);
  private readonly notifications = inject(NotificationService);

  private readonly _cableId = signal<string | null>(null);
  private readonly _state = signal<SheetState>('idle');
  private readonly _attachments = signal<readonly CableAttachmentResponse[]>([]);
  private readonly _tubes = signal<readonly TubeView[]>([]);
  private readonly _editing = signal(false);
  private readonly _draft = signal<readonly RouteItem[]>([]);
  private readonly _picking = signal(false);
  private readonly _saving = signal(false);

  readonly cableId = this._cableId.asReadonly();
  readonly state = this._state.asReadonly();
  readonly attachments = this._attachments.asReadonly();
  readonly tubes = this._tubes.asReadonly();
  readonly editing = this._editing.asReadonly();
  readonly draft = this._draft.asReadonly();
  readonly picking = this._picking.asReadonly();
  readonly saving = this._saving.asReadonly();

  readonly route = computed(() => describeCableRoute(this._attachments()));
  readonly routeItems = computed(() => toRouteItems(this._attachments()));
  readonly fiberCount = computed(() =>
    this._tubes().reduce((total, tube) => total + tube.fibers.length, 0),
  );

  /** Chaves (`olt:id` / `box:id`) dos elementos do cabo — rascunho durante a edição. */
  readonly elementKeys = computed<ReadonlySet<string>>(() => {
    const items = this._editing() ? this._draft() : this.routeItems();
    return new Set(items.map((item) => `${item.ref.kind}:${item.ref.id}`));
  });

  open(cableId: string): void {
    if (this._cableId() === cableId && this._state() !== 'error') {
      return;
    }
    this._cableId.set(cableId);
    this._editing.set(false);
    this._picking.set(false);
    this._draft.set([]);
    this._attachments.set([]);
    this._tubes.set([]);
    this.reload();
  }

  close(): void {
    this._cableId.set(null);
    this._state.set('idle');
    this._editing.set(false);
    this._picking.set(false);
  }

  reload(): void {
    const id = this._cableId();
    if (!id) {
      return;
    }
    this._state.set('loading');
    forkJoin({
      attachments: this.cableApi.listAttachments(id),
      tubes: this.cableApi.listTubes(id),
      fibers: this.cableApi.listFibers(id),
    }).subscribe({
      next: ({ attachments, tubes, fibers }) => {
        if (this._cableId() !== id) return;
        this._attachments.set(attachments);
        this._tubes.set(groupFibers(tubes, fibers));
        this._state.set('ready');
      },
      error: () => {
        if (this._cableId() === id) this._state.set('error');
      },
    });
  }

  // --- Lista de elementos ---------------------------------------------------

  startEditing(): void {
    this._draft.set(this.routeItems());
    this._editing.set(true);
  }

  cancelEditing(): void {
    this._editing.set(false);
    this._picking.set(false);
    this._draft.set([]);
  }

  setPicking(picking: boolean): void {
    this._picking.set(picking && this._editing());
  }

  addToDraft(item: RouteItem): void {
    this._draft.update((items) => [...items, item]);
  }

  moveItem(index: number, delta: number): void {
    this._draft.update((items) => {
      const target = index + delta;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  removeItem(index: number): void {
    this._draft.update((items) => items.filter((_, i) => i !== index));
  }

  saveRoute(): void {
    const id = this._cableId();
    const items = this._draft();
    if (!id || this._saving()) return;
    const problem = validateRoute(items);
    if (problem) {
      this.notifications.warning(problem);
      return;
    }
    this._saving.set(true);
    this.cableApi.setAttachments(id, toAttachmentRequests(items)).subscribe({
      next: (saved) => {
        this._saving.set(false);
        if (this._cableId() !== id) return;
        this._attachments.set(saved);
        this._editing.set(false);
        this._picking.set(false);
        this.notifications.success('Lista de elementos do cabo salva.');
      },
      error: (error: unknown) => {
        this._saving.set(false);
        this.notifications.apiError(error);
      },
    });
  }

  // --- Estrutura ------------------------------------------------------------

  createStructure(capacity: number, perTube: number): void {
    const id = this._cableId();
    const tubes = planStructure(capacity, perTube);
    if (!id || tubes.length === 0 || this._saving()) return;
    this._saving.set(true);
    this.cableApi.createStructure(id, { tubes }).subscribe({
      next: () => {
        this._saving.set(false);
        this.notifications.success('Tubos e fibras criados.');
        this.reload();
      },
      error: (error: unknown) => {
        this._saving.set(false);
        this.notifications.apiError(error);
      },
    });
  }

  setFiberStatus(fiber: CableFiberResponse, status: FiberStatus): void {
    if (!fiber.id || !fiber.tubeId) return;
    this.fiberApi.setStatus(fiber.tubeId, fiber.id, { status }).subscribe({
      next: (saved) =>
        this._tubes.update((tubes) =>
          tubes.map((tube) => ({
            ...tube,
            fibers: tube.fibers.map((item) =>
              item.id === fiber.id ? { ...item, status: saved.status ?? status } : item,
            ),
          })),
        ),
      error: (error: unknown) => this.notifications.apiError(error),
    });
  }
}

function groupFibers(
  tubes: readonly LooseTubeResponse[],
  fibers: readonly CableFiberResponse[],
): TubeView[] {
  return [...tubes]
    .sort((a, b) => (a.tubeNumber ?? 0) - (b.tubeNumber ?? 0))
    .map((tube) => ({
      id: tube.id ?? '',
      tubeNumber: tube.tubeNumber ?? 0,
      capacity: tube.capacity ?? 0,
      color: tube.color,
      fibers: fibers
        .filter((fiber) => fiber.tubeId === tube.id)
        .sort((a, b) => (a.numberInTube ?? 0) - (b.numberInTube ?? 0)),
    }));
}
