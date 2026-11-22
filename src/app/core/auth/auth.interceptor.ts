import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { AuthSession } from './auth-session';

/** Marca a repetição depois do refresh, para não repetir de novo. */
export const AUTH_RETRIED = new HttpContextToken(() => false);

/**
 * Chamadas à API do GeoFiber: sempre com o cookie (`withCredentials`) e, fora de `/auth/*`, com o
 * Bearer. Um 401 espera o refresh da sessão (um só em andamento) e repete a chamada uma vez.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL);
  if (!request.url.startsWith(base)) return next(request);

  const session = inject(AuthSession);
  const isAuthRoute = request.url.startsWith(`${base}/auth/`);
  const send = (token: string | null, retried: boolean) =>
    next(prepare(request, isAuthRoute ? null : token, retried));

  if (isAuthRoute) return send(null, false);

  return send(session.token(), false).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);
      return session.refresh().pipe(
        switchMap((token) => retryOnce(send, token, session)),
      );
    }),
  );
};

function retryOnce(
  send: (token: string | null, retried: boolean) => ReturnType<HttpHandlerFn>,
  token: string,
  session: AuthSession,
) {
  return send(token, true).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) session.expire();
      return throwError(() => error);
    }),
  );
}

function prepare(request: HttpRequest<unknown>, token: string | null, retried: boolean): HttpRequest<unknown> {
  return request.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    context: retried ? request.context.set(AUTH_RETRIED, true) : request.context,
  });
}
