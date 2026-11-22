import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { SessionStatus, AuthSession } from './auth-session';
import { adminGuard, authGuard, guestGuard, safeReturnUrl } from './auth-guards';

function run(guard: typeof authGuard, status: SessionStatus, url = '/importar') {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthSession, useValue: { start: () => Promise.resolve(status) } }],
  });
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
  return result.then((value) =>
    value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value,
  );
}

describe('safeReturnUrl', () => {
  it('aceita só caminhos internos', () => {
    expect(safeReturnUrl('/caixas/b1/fusoes')).toBe('/caixas/b1/fusoes');
    expect(safeReturnUrl('/?trace=SPLICE:s1')).toBe('/?trace=SPLICE:s1');
    for (const value of ['//site.com', '/\\site.com', 'https://site.com', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeReturnUrl(value)).toBe('/');
    }
  });
});

describe('authGuard', () => {
  it('deixa passar quem entrou', async () => {
    expect(await run(authGuard, 'signedIn')).toBe(true);
  });

  it('manda ao login com a volta quem está fora ou sem conexão', async () => {
    expect(await run(authGuard, 'signedOut')).toBe('/entrar?voltar=%2Fimportar');
    TestBed.resetTestingModule();
    expect(await run(authGuard, 'offline')).toBe('/entrar?voltar=%2Fimportar');
  });

  it('sem volta quando o destino é o mapa', async () => {
    expect(await run(authGuard, 'signedOut', '/')).toBe('/entrar');
  });
});

describe('guestGuard', () => {
  it('quem já entrou vai para o mapa', async () => {
    expect(await run(guestGuard, 'signedIn', '/entrar')).toBe('/');
  });

  it('quem está fora vê o login', async () => {
    expect(await run(guestGuard, 'signedOut', '/entrar')).toBe(true);
  });
});

function runAdmin(status: SessionStatus, isAdmin: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthSession, useValue: { start: () => Promise.resolve(status), isAdmin: () => isAdmin } },
    ],
  });
  const result = TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, { url: '/usuarios' } as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
  return result.then((value) =>
    value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value,
  );
}

describe('adminGuard', () => {
  it('deixa passar o administrador', async () => {
    expect(await runAdmin('signedIn', true)).toBe(true);
  });

  it('manda o técnico para o mapa', async () => {
    expect(await runAdmin('signedIn', false)).toBe('/');
  });

  it('sem sessão vai para o mapa (o authGuard, antes na rota, cuida do login)', async () => {
    expect(await runAdmin('signedOut', false)).toBe('/');
  });
});
