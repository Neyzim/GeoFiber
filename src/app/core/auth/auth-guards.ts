import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

/** Só caminhos internos (`/…`, nunca `//…` nem `/\…`): evita mandar a pessoa para outro site. */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

/** Telas da rede: espera a sessão; quem não entrou (ou está sem conexão) vai para `/entrar`. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if ((await session.start()) === 'signedIn') return true;
  const queryParams = state.url && state.url !== '/' ? { voltar: state.url } : {};
  return router.createUrlTree(['/entrar'], { queryParams });
};

/** `/entrar`: quem já entrou vai direto para o mapa. */
export const guestGuard: CanActivateFn = async () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  return (await session.start()) === 'signedIn' ? router.createUrlTree(['/']) : true;
};

/** Telas de administrador: quem não é ADMIN vai para o mapa. Vem depois do `authGuard` na rota. */
export const adminGuard: CanActivateFn = async () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  return (await session.start()) === 'signedIn' && session.isAdmin() ? true : router.createUrlTree(['/']);
};
