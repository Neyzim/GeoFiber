import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, share, throwError } from 'rxjs';
import { parseApiError } from '../api/api-error';
import { TokenResponse } from '../api/api-types';
import { AuthApi } from './auth-api';
import { readTokenClaims } from './jwt';

/** `checking` = ainda não perguntou; `offline` = o servidor não respondeu ao abrir. */
export type SessionStatus = 'checking' | 'offline' | 'signedIn' | 'signedOut';

const MIN_RENEW_SECONDS = 10;
const RENEW_MARGIN_SECONDS = 60;
const RETRY_OFFLINE_MS = 30_000;

/**
 * Sessão do usuário. O token de acesso fica só em memória (nunca no armazenamento do navegador);
 * o refresh vive no cookie httpOnly. Só um refresh fica em andamento por vez: o backend rotaciona
 * o cookie e trata dois pedidos simultâneos como reuso, encerrando todas as sessões.
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly _status = signal<SessionStatus>('checking');
  private readonly _token = signal<string | null>(null);
  private readonly claims = computed(() => {
    const token = this._token();
    return token ? readTokenClaims(token) : { userId: null, role: null };
  });

  readonly status = this._status.asReadonly();
  readonly role = computed(() => this.claims().role);
  readonly userId = computed(() => this.claims().userId);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  private starting: Promise<SessionStatus> | null = null;
  private inflight: Observable<string> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  token(): string | null {
    return this._token();
  }

  /** Recupera a sessão pelo cookie ao abrir o app. Chamadas repetidas reaproveitam a mesma. */
  start(): Promise<SessionStatus> {
    if (this.starting) return this.starting;
    const status = this._status();
    if (status === 'signedIn' || status === 'signedOut') return Promise.resolve(status);
    this._status.set('checking');
    this.starting = new Promise<SessionStatus>((resolve) => {
      this.refresh().subscribe({
        next: () => resolve('signedIn'),
        error: (error: unknown) => {
          if (statusOf(error) !== 401) this._status.set('offline');
          resolve(this._status());
        },
      });
    }).finally(() => (this.starting = null));
    return this.starting;
  }

  login(email: string, password: string): Observable<void> {
    return this.api.login({ email, password }).pipe(
      map((response) => this.accept(response)),
      catchError((error: unknown) => throwError(() => parseApiError(error))),
    );
  }

  /** Token novo. Enquanto um pedido está em andamento, todos recebem o mesmo. */
  refresh(): Observable<string> {
    if (this.inflight) return this.inflight;
    this.inflight = this.api.refresh().pipe(
      map((response) => {
        this.accept(response);
        return this._token() ?? '';
      }),
      catchError((error: unknown) => {
        if (statusOf(error) === 401) {
          if (this._status() === 'signedIn') this.expire();
          else this.clear();
        }
        return throwError(() => error);
      }),
      finalize(() => (this.inflight = null)),
      share(),
    );
    return this.inflight;
  }

  /** Sai: com sucesso ou erro do servidor, limpa a memória e vai para o login. */
  logout(): void {
    this.stopTimer();
    const done = () => {
      this.clear();
      void this.router.navigate(['/entrar']);
    };
    this.api.logout().subscribe({ complete: done, error: done });
  }

  /** Sessão encerrada pelo backend: login com o aviso e a volta para onde estava. */
  expire(): void {
    this.clear();
    const url = this.router.url;
    const queryParams = url.startsWith('/entrar') ? { expirou: 1 } : { expirou: 1, voltar: url };
    void this.router.navigate(['/entrar'], { queryParams });
  }

  private accept(response: TokenResponse): void {
    this._token.set(response.accessToken ?? null);
    this._status.set('signedIn');
    this.schedule(response.expiresIn ?? 0);
  }

  private clear(): void {
    this.stopTimer();
    this._token.set(null);
    this._status.set('signedOut');
  }

  private schedule(expiresIn: number): void {
    const seconds = Math.max(MIN_RENEW_SECONDS, expiresIn - RENEW_MARGIN_SECONDS);
    this.startTimer(seconds * 1000);
  }

  private renew(): void {
    this.refresh().subscribe({
      error: (error: unknown) => {
        if (statusOf(error) === 0 && this._status() === 'signedIn') this.startTimer(RETRY_OFFLINE_MS);
      },
    });
  }

  private startTimer(ms: number): void {
    this.stopTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.renew();
    }, ms);
  }

  private stopTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

function statusOf(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}
