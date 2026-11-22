import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, concatMap, map, of, switchMap, tap } from 'rxjs';
import { SpliceSides, TrayChoice, trayChoiceText } from '../../../core/network/splice-plan';
import {
  BoxOverviewResponse,
  ConnectionRequest,
  FiberEnd,
  ServicePortRequest,
  ServicePortResponse,
  SplitterPortResponse,
  SplitterPortUpdateRequest,
  SplitterRatio,
} from '../../../core/api/api-types';
import { parseApiError } from '../../../core/api/api-error';
import { BoxApi } from '../../../core/api/resources/box-api';
import { CableApi } from '../../../core/api/resources/cable-api';
import { ConnectionApi } from '../../../core/api/resources/connection-api';
import { ServicePortApi } from '../../../core/api/resources/service-port-api';
import { SpliceApi } from '../../../core/api/resources/splice-api';
import { SplitterApi } from '../../../core/api/resources/splitter-api';
import { TrayApi } from '../../../core/api/resources/tray-api';
import {
  FiberIndex,
  describeBoxSummary,
  indexFibers,
  nextNumber,
} from '../../../core/network/box-interior';
import { NotificationService } from '../../../core/services/notification';
import { loadCableFibers } from '../sheet-support';

export type BoxSheetState = 'idle' | 'loading' | 'ready' | 'error';

/** Uma fibra escolhida para ligar (a ponta é opcional: o backend usa o padrão). */
export interface FiberChoice {
  fiberId: string;
  fiberEnd?: FiberEnd;
}

/** Origem do sinal de uma porta de atendimento. `null` = nada ligado. */
export type PortSource = { splitterPortId: string } | FiberChoice | null;

/**
 * Estado da ficha da caixa aberta: visão geral do backend e as fibras dos cabos da caixa (para
 * dar nome às fibras). Toda escrita recarrega a ficha. Provido pela página do mapa.
 */
@Injectable()
export class BoxSheetStore {
  private readonly boxApi = inject(BoxApi);
  private readonly cableApi = inject(CableApi);
  private readonly trayApi = inject(TrayApi);
  private readonly spliceApi = inject(SpliceApi);
  private readonly connectionApi = inject(ConnectionApi);
  private readonly splitterApi = inject(SplitterApi);
  private readonly servicePortApi = inject(ServicePortApi);
  private readonly notifications = inject(NotificationService);

  private readonly _boxId = signal<string | null>(null);
  private readonly _state = signal<BoxSheetState>('idle');
  private readonly _overview = signal<BoxOverviewResponse | null>(null);
  private readonly _fiberIndex = signal<FiberIndex>(new Map());
  private readonly _saving = signal(false);

  readonly boxId = this._boxId.asReadonly();
  readonly state = this._state.asReadonly();
  readonly overview = this._overview.asReadonly();
  readonly fiberIndex = this._fiberIndex.asReadonly();
  readonly saving = this._saving.asReadonly();

  readonly summary = computed(() => {
    const overview = this._overview();
    return overview ? describeBoxSummary(overview) : '';
  });
  readonly cables = computed(() => this._overview()?.cables ?? []);
  readonly trays = computed(() =>
    [...(this._overview()?.trays ?? [])].sort((a, b) => (a.trayNumber ?? 0) - (b.trayNumber ?? 0)),
  );
  readonly splices = computed(() => this._overview()?.splices ?? []);
  readonly connectors = computed(() =>
    (this._overview()?.connections ?? []).filter((item) => item.type === 'CONNECTOR'),
  );
  readonly splitters = computed(() => this._overview()?.splitters ?? []);
  readonly servicePorts = computed(() =>
    [...(this._overview()?.servicePorts ?? [])].sort(
      (a, b) => (a.portNumber ?? 0) - (b.portNumber ?? 0),
    ),
  );
  readonly customers = computed(
    () => new Map((this._overview()?.customers ?? []).map((item) => [item.id ?? '', item])),
  );

  open(boxId: string): void {
    if (this._boxId() === boxId && this._state() !== 'error') {
      return;
    }
    this._boxId.set(boxId);
    this._overview.set(null);
    this._fiberIndex.set(new Map());
    this.reload();
  }

  close(): void {
    this._boxId.set(null);
    this._state.set('idle');
  }

  reload(): void {
    const id = this._boxId();
    if (!id) return;
    this._state.set('loading');
    this.boxApi
      .overview(id)
      .pipe(
        switchMap((overview) =>
          loadCableFibers(this.cableApi, overview.cables ?? []).pipe(
            map((list) => ({ overview, list })),
          ),
        ),
      )
      .subscribe({
        next: ({ overview, list }) => {
          if (this._boxId() !== id) return;
          this._overview.set(overview);
          this._fiberIndex.set(indexFibers(list));
          this._state.set('ready');
        },
        error: () => {
          if (this._boxId() === id) this._state.set('error');
        },
      });
  }

  // --- Bandejas e fusões ----------------------------------------------------

  deleteTray(trayId: string): void {
    const id = this._boxId();
    if (id) this.run(this.trayApi.delete(id, trayId), 'Bandeja excluída.');
  }

  /**
   * Emenda do diagrama: cria a bandeja quando a escolha pede, depois a fusão sem posição (o backend
   * usa a próxima livre). `done` recebe `null` e o id da emenda nova, ou a frase do erro.
   */
  spliceFibers(choice: TrayChoice, sides: SpliceSides, done: (error: string | null, spliceId?: string) => void): void {
    const id = this._boxId();
    if (!id || this._saving()) return;
    if (choice.kind === 'full') {
      done(trayChoiceText(choice));
      return;
    }
    this._saving.set(true);
    let trayCreated = false;
    const tray$: Observable<unknown> =
      choice.kind === 'create'
        ? this.trayApi
            .create(id, { trayNumber: choice.trayNumber, capacity: choice.capacity })
            .pipe(tap(() => (trayCreated = true)))
        : of(null);
    tray$
      .pipe(concatMap(() => this.spliceApi.create(id, { trayNumber: choice.trayNumber, ...sides })))
      .subscribe({
        next: (splice) => {
          this._saving.set(false);
          this.notifications.success('Emenda registrada.');
          done(null, splice.id);
          this.reload();
        },
        error: (error: unknown) => {
          this._saving.set(false);
          done(parseApiError(error).message);
          if (trayCreated) this.reload();
        },
      });
  }

  deleteSplice(spliceId: string): void {
    const id = this._boxId();
    if (id) this.run(this.spliceApi.delete(id, spliceId), 'Fusão excluída.');
  }

  // --- Conectores -------------------------------------------------------------

  addConnector(body: ConnectionRequest): void {
    const id = this._boxId();
    if (id) this.run(this.connectionApi.create(id, body), 'Conexão registrada.');
  }

  deleteConnector(connectionId: string): void {
    const id = this._boxId();
    if (id) this.run(this.connectionApi.delete(id, connectionId), 'Conexão excluída.');
  }

  // --- Splitters --------------------------------------------------------------

  addSplitter(ratio: SplitterRatio, balanced: boolean, createServicePorts: boolean): void {
    const id = this._boxId();
    if (!id) return;
    this.run(
      this.splitterApi.create(id, { ratio, balanced, createServicePorts }),
      'Splitter criado.',
    );
  }

  deleteSplitter(splitterId: string): void {
    const id = this._boxId();
    if (id) this.run(this.splitterApi.delete(id, splitterId), 'Splitter excluído.');
  }

  /** Liga (ou desliga, com `null`) uma fibra numa porta do splitter, mantendo a atenuação. */
  linkSplitterPort(splitterId: string, port: SplitterPortResponse, choice: FiberChoice | null): void {
    if (!port.id) return;
    const body: SplitterPortUpdateRequest = {};
    if (port.attenuationDb !== undefined) body.attenuationDb = port.attenuationDb;
    if (choice) {
      body.fiberId = choice.fiberId;
      if (choice.fiberEnd) body.fiberEnd = choice.fiberEnd;
    }
    this.run(
      this.splitterApi.updatePort(splitterId, port.id, body),
      choice ? 'Fibra ligada ao splitter.' : 'Fibra desligada do splitter.',
    );
  }

  // --- Portas de atendimento --------------------------------------------------

  /** Nova porta com o número seguinte; a origem do sinal é opcional. */
  addServicePort(input: { label?: string } & SourceFields): void {
    const id = this._boxId();
    if (!id) return;
    const portNumber = nextNumber(this.servicePorts().map((port) => port.portNumber ?? 0));
    const { label, ...source } = input;
    const body: ServicePortRequest = { portNumber, ...withLabel(label), ...sourceFields(source) };
    this.run(this.servicePortApi.create(id, body), `Porta ${portNumber} criada.`);
  }

  setServicePortSource(port: ServicePortResponse, source: PortSource): void {
    const id = this._boxId();
    if (!id || !port.id) return;
    const body: ServicePortRequest = {
      portNumber: port.portNumber ?? 0,
      ...withLabel(port.label),
      ...sourceFields(source ?? {}),
    };
    this.run(this.servicePortApi.update(id, port.id, body), 'Origem do sinal atualizada.');
  }

  deleteServicePort(portId: string): void {
    const id = this._boxId();
    if (id) this.run(this.servicePortApi.delete(id, portId), 'Porta excluída.');
  }

  private run(request: Observable<unknown>, success: string): void {
    if (this._saving()) return;
    this._saving.set(true);
    request.subscribe({
      next: () => {
        this._saving.set(false);
        this.notifications.success(success);
        this.reload();
      },
      error: (error: unknown) => {
        this._saving.set(false);
        this.notifications.apiError(error);
      },
    });
  }
}

function withLabel(label: string | undefined): { label?: string } {
  const trimmed = label?.trim();
  return trimmed ? { label: trimmed } : {};
}

interface SourceFields {
  splitterPortId?: string;
  fiberId?: string;
  fiberEnd?: FiberEnd;
}

function sourceFields(source: SourceFields): Pick<ServicePortRequest, 'splitterPortId' | 'fiberId' | 'fiberEnd'> {
  if (source.splitterPortId) return { splitterPortId: source.splitterPortId };
  if (source.fiberId) {
    return source.fiberEnd
      ? { fiberId: source.fiberId, fiberEnd: source.fiberEnd }
      : { fiberId: source.fiberId };
  }
  return {};
}
