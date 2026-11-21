import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TraceApi } from '../../core/api/resources/trace-api';
import { TraceDirection, TraceKind, TraceResponse } from '../../core/api/trace-types';

export type TraceState = 'idle' | 'loading' | 'ready' | 'error';

const NOT_FOUND = 'Não encontramos este item na rede.';
const FAILED = 'Não foi possível rastrear agora. Tente de novo.';

interface Query {
  kind: TraceKind;
  id: string;
  direction: TraceDirection;
}

/**
 * Consulta do rastreio: o ponto escolhido, o sentido e a resposta do backend.
 * Uma consulta nova cancela a anterior, então só a última resposta chega à tela.
 * Abrir uma saída de splitter guarda a origem, para o botão "Voltar".
 * Provido pela página do mapa.
 */
@Injectable()
export class TraceStore {
  private readonly api = inject(TraceApi);
  private sub: Subscription | null = null;

  private readonly _query = signal<Query | null>(null);
  private readonly _state = signal<TraceState>('idle');
  private readonly _response = signal<TraceResponse | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _history = signal<Query[]>([]);

  readonly query = this._query.asReadonly();
  readonly state = this._state.asReadonly();
  readonly response = this._response.asReadonly();
  readonly error = this._error.asReadonly();
  readonly kind = computed(() => this._query()?.kind ?? null);
  readonly id = computed(() => this._query()?.id ?? null);
  readonly direction = computed<TraceDirection>(() => this._query()?.direction ?? 'UPSTREAM');
  readonly canGoBack = computed(() => this._history().length > 0);

  open(kind: TraceKind, id: string, direction: TraceDirection = 'UPSTREAM'): void {
    this._history.set([]);
    this.run({ kind, id, direction });
  }

  setDirection(direction: TraceDirection): void {
    const current = this._query();
    if (!current) return;
    this.run({ ...current, direction });
  }

  /** Abre a saída de um splitter: sempre descendo, a partir da porta. */
  openBranch(traceRef: string): void {
    const current = this._query();
    if (!current) return;
    this._history.update((list) => [...list, current]);
    this.run({ kind: 'SPLITTER_PORT', id: traceRef, direction: 'DOWNSTREAM' });
  }

  back(): void {
    const history = this._history();
    const previous = history[history.length - 1];
    if (!previous) return;
    this._history.set(history.slice(0, -1));
    this.run(previous);
  }

  close(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this._query.set(null);
    this._history.set([]);
    this._response.set(null);
    this._error.set(null);
    this._state.set('idle');
  }

  private run(query: Query): void {
    this.sub?.unsubscribe();
    this._query.set(query);
    this._state.set('loading');
    this._response.set(null);
    this._error.set(null);
    this.sub = this.api.trace(query.kind, query.id, query.direction).subscribe({
      next: (response) => {
        this._response.set(response);
        this._state.set('ready');
      },
      error: (error: unknown) => {
        this._error.set(error instanceof HttpErrorResponse && error.status === 404 ? NOT_FOUND : FAILED);
        this._state.set('error');
      },
    });
  }
}
