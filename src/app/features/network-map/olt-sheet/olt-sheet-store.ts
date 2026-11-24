import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, concatMap, forkJoin, from, map, switchMap, tap, toArray } from 'rxjs';
import {
  AttachedCableResponse,
  OltPortRequest,
  OltPortResponse,
  PortStatus,
} from '../../../core/api/api-types';
import { CableApi } from '../../../core/api/resources/cable-api';
import { OltApi } from '../../../core/api/resources/olt-api';
import { FiberIndex, indexFibers } from '../../../core/network/box-interior';
import { describeOltSummary, groupPortsBySlot, planPorts } from '../../../core/network/olt-ports';
import { NotificationService } from '../../../core/services/notification';
import { FiberChoice } from '../box-sheet/box-sheet-store';
import { loadCableFibers } from '../sheet-support';

export type OltSheetState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Estado da ficha da OLT aberta: portas PON, cabos que saem dela e as fibras desses cabos.
 * Toda escrita recarrega a ficha. Provido pela página do mapa.
 */
@Injectable()
export class OltSheetStore {
  private readonly oltApi = inject(OltApi);
  private readonly cableApi = inject(CableApi);
  private readonly notifications = inject(NotificationService);

  private readonly _oltId = signal<string | null>(null);
  private readonly _state = signal<OltSheetState>('idle');
  private readonly _ports = signal<readonly OltPortResponse[]>([]);
  private readonly _cables = signal<readonly AttachedCableResponse[]>([]);
  private readonly _fiberIndex = signal<FiberIndex>(new Map());
  private readonly _saving = signal(false);
  private readonly _batchProgress = signal<{ done: number; total: number } | null>(null);

  readonly oltId = this._oltId.asReadonly();
  readonly state = this._state.asReadonly();
  readonly ports = this._ports.asReadonly();
  readonly cables = this._cables.asReadonly();
  readonly fiberIndex = this._fiberIndex.asReadonly();
  readonly saving = this._saving.asReadonly();
  /** Progresso da criação em lote ("Criando porta X de N…"); `null` fora dela. */
  readonly batchProgress = this._batchProgress.asReadonly();

  readonly slots = computed(() => groupPortsBySlot(this._ports()));
  readonly summary = computed(() => describeOltSummary(this._ports(), this._cables().length));

  open(oltId: string): void {
    if (this._oltId() === oltId && this._state() !== 'error') {
      return;
    }
    this._oltId.set(oltId);
    this._ports.set([]);
    this._cables.set([]);
    this._fiberIndex.set(new Map());
    this.reload();
  }

  close(): void {
    this._oltId.set(null);
    this._state.set('idle');
  }

  reload(): void {
    const id = this._oltId();
    if (!id) return;
    this._state.set('loading');
    forkJoin({ ports: this.oltApi.listPorts(id), cables: this.oltApi.listCables(id) })
      .pipe(
        switchMap(({ ports, cables }) =>
          loadCableFibers(this.cableApi, cables).pipe(map((fibers) => ({ ports, cables, fibers }))),
        ),
      )
      .subscribe({
        next: ({ ports, cables, fibers }) => {
          if (this._oltId() !== id) return;
          this._ports.set(ports);
          this._cables.set(cables);
          this._fiberIndex.set(indexFibers(fibers));
          this._state.set('ready');
        },
        error: () => {
          if (this._oltId() === id) this._state.set('error');
        },
      });
  }

  /** Cria `count` portas na placa `slot`, uma de cada vez; para na primeira falha. */
  addPorts(slot: number, count: number): void {
    const id = this._oltId();
    const planned = planPorts(this._ports(), slot, count);
    if (!id || planned.length === 0 || this._saving()) return;
    this._saving.set(true);
    this._batchProgress.set({ done: 0, total: planned.length });
    from(planned)
      .pipe(
        concatMap((body) => this.oltApi.createPort(id, body)),
        tap(() =>
          this._batchProgress.update((progress) =>
            progress ? { ...progress, done: progress.done + 1 } : progress,
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: (created) => {
          this._saving.set(false);
          this._batchProgress.set(null);
          this.notifications.success(
            created.length === 1 ? 'Porta PON criada.' : `${created.length} portas PON criadas.`,
          );
          this.reload();
        },
        error: (error: unknown) => {
          this._saving.set(false);
          this._batchProgress.set(null);
          this.notifications.apiError(error);
          this.reload();
        },
      });
  }

  /** Liga (ou desliga, com `null`) uma fibra na porta, mantendo placa e número. */
  linkPort(port: OltPortResponse, choice: FiberChoice | null): void {
    const body = this.positionOf(port);
    if (choice) {
      body.fiberId = choice.fiberId;
      if (choice.fiberEnd) body.fiberEnd = choice.fiberEnd;
    }
    this.update(port, body, choice ? 'Fibra ligada à porta PON.' : 'Fibra desligada da porta PON.');
  }

  /** Situação manual (livre, reservada, com defeito) de uma porta sem fibra. */
  setPortStatus(port: OltPortResponse, status: Exclude<PortStatus, 'OCCUPIED'>): void {
    this.update(port, { ...this.positionOf(port), status }, 'Situação da porta atualizada.');
  }

  deletePort(port: OltPortResponse): void {
    const id = this._oltId();
    if (!id || !port.id || this._saving()) return;
    this.run(this.oltApi.deletePort(id, port.id), 'Porta PON excluída.');
  }

  private positionOf(port: OltPortResponse): OltPortRequest {
    return { slotNumber: port.slotNumber ?? 0, portNumber: port.portNumber ?? 0 };
  }

  private update(port: OltPortResponse, body: OltPortRequest, success: string): void {
    const id = this._oltId();
    if (!id || !port.id) return;
    this.run(this.oltApi.updatePort(id, port.id, body), success);
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
