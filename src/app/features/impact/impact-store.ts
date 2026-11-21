import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImpactKind, ImpactResponse } from '../../core/api/impact-types';
import { ImpactApi } from '../../core/api/resources/impact-api';

export type ImpactState = 'idle' | 'loading' | 'ready' | 'error';

const NOT_FOUND = 'Não encontramos este item na rede.';
const FAILED = 'Não foi possível calcular o impacto agora. Tente de novo.';

/**
 * Consulta do impacto: o item escolhido e a resposta do backend. Uma consulta nova cancela a
 * anterior, então só a última resposta chega à tela. Provido pela página do mapa.
 */
@Injectable()
export class ImpactStore {
  private readonly api = inject(ImpactApi);
  private sub: Subscription | null = null;

  private readonly _query = signal<{ kind: ImpactKind; id: string } | null>(null);
  private readonly _state = signal<ImpactState>('idle');
  private readonly _response = signal<ImpactResponse | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly query = this._query.asReadonly();
  readonly state = this._state.asReadonly();
  readonly response = this._response.asReadonly();
  readonly error = this._error.asReadonly();
  readonly active = computed(() => this._query() !== null);

  open(kind: ImpactKind, id: string): void {
    this.sub?.unsubscribe();
    this._query.set({ kind, id });
    this._state.set('loading');
    this._response.set(null);
    this._error.set(null);
    this.sub = this.api.impact(kind, id).subscribe({
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

  close(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this._query.set(null);
    this._response.set(null);
    this._error.set(null);
    this._state.set('idle');
  }
}
