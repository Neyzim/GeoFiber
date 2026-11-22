import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { TokenResponse } from '../api/api-types';
import { fakeJwt } from '../../../testing/auth-fixtures';
import { AuthApi } from './auth-api';
import { AuthSession } from './auth-session';

const T1 = fakeJwt({ sub: 'u1', role: 'MEMBER' });
const T2 = fakeJwt({ sub: 'u1', role: 'ADMIN' });

function http(status: number, detail?: string) {
  return new HttpErrorResponse({ status, error: detail ? { status, detail } : null });
}

function setup() {
  const refreshes: Subject<TokenResponse>[] = [];
  const api = {
    login: vi.fn(() => of<TokenResponse>({ accessToken: T1, expiresIn: 900 })),
    refresh: vi.fn(() => {
      const subject = new Subject<TokenResponse>();
      refreshes.push(subject);
      return subject;
    }),
    logout: vi.fn(() => of(undefined as void)),
  };
  const router = { url: '/caixas/b1/fusoes', navigate: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthApi, useValue: api },
      { provide: Router, useValue: router },
    ],
  });
  const answer = (index: number, token: string, expiresIn = 900) => {
    refreshes[index].next({ accessToken: token, expiresIn });
    refreshes[index].complete();
  };
  const fail = (index: number, error: HttpErrorResponse) => refreshes[index].error(error);
  return { session: TestBed.inject(AuthSession), api, router, answer, fail };
}

describe('AuthSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('start com refresh 200 entra, guarda o token e lê o papel; um só pedido', async () => {
    const { session, api, answer } = setup();
    const first = session.start();
    const second = session.start();
    answer(0, T1);
    expect(await first).toBe('signedIn');
    expect(await second).toBe('signedIn');
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(session.token()).toBe(T1);
    expect(session.role()).toBe('MEMBER');
    expect(session.isAdmin()).toBe(false);
    expect(await session.start()).toBe('signedIn');
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('start com 401 fica fora, sem navegar', async () => {
    const { session, router, fail } = setup();
    const result = session.start();
    fail(0, http(401, 'Credenciais inválidas ou sessão expirada.'));
    expect(await result).toBe('signedOut');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('start sem conexão fica offline e tenta de novo na próxima chamada', async () => {
    const { session, api, fail, answer } = setup();
    const first = session.start();
    fail(0, http(0));
    expect(await first).toBe('offline');
    const second = session.start();
    expect(api.refresh).toHaveBeenCalledTimes(2);
    answer(1, T1);
    expect(await second).toBe('signedIn');
  });

  it('refresh duas vezes antes da resposta faz um pedido só e entrega o mesmo token', () => {
    const { session, api, answer } = setup();
    const got: string[] = [];
    session.refresh().subscribe((token) => got.push(token));
    session.refresh().subscribe((token) => got.push(token));
    expect(api.refresh).toHaveBeenCalledTimes(1);
    answer(0, T2);
    expect(got).toEqual([T2, T2]);
    session.refresh().subscribe();
    expect(api.refresh).toHaveBeenCalledTimes(2);
  });

  it('refresh 401 encerra e manda ao login com a volta', () => {
    const { session, router, fail } = setup();
    session.login('a@x.com', 'senha-com-dez').subscribe();
    session.refresh().subscribe({ error: () => undefined });
    fail(0, http(401));
    expect(session.status()).toBe('signedOut');
    expect(session.token()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { expirou: 1, voltar: '/caixas/b1/fusoes' },
    });
  });

  it('refresh sem conexão mantém a sessão e o token', () => {
    const { session, fail } = setup();
    session.login('a@x.com', 'senha-com-dez').subscribe();
    let failed = false;
    session.refresh().subscribe({ error: () => (failed = true) });
    fail(0, http(0));
    expect(failed).toBe(true);
    expect(session.status()).toBe('signedIn');
    expect(session.token()).toBe(T1);
  });

  it('renova 60 s antes do fim, no mínimo 10 s, e tenta de novo em 30 s sem conexão', () => {
    const { session, api, fail, answer } = setup();
    session.login('a@x.com', 'senha-com-dez').subscribe();
    vi.advanceTimersByTime(839_999);
    expect(api.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    fail(0, http(0));
    vi.advanceTimersByTime(30_000);
    expect(api.refresh).toHaveBeenCalledTimes(2);
    answer(1, T2, 30);
    vi.advanceTimersByTime(10_000);
    expect(api.refresh).toHaveBeenCalledTimes(3);
  });

  it('logout com erro ainda limpa, vai ao login e para o timer', () => {
    const { session, api, router } = setup();
    session.login('a@x.com', 'senha-com-dez').subscribe();
    api.logout.mockReturnValueOnce(throwError(() => http(500)));
    session.logout();
    expect(session.token()).toBeNull();
    expect(session.status()).toBe('signedOut');
    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
    vi.advanceTimersByTime(900_000);
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('login 401 devolve o erro em português', () => {
    const { session, api } = setup();
    api.login.mockReturnValueOnce(throwError(() => http(401, 'Credenciais inválidas ou sessão expirada.')));
    let message = '';
    session.login('a@x.com', 'errada').subscribe({ error: (error) => (message = error.message) });
    expect(message).toBe('Credenciais inválidas ou sessão expirada.');
    expect(session.status()).not.toBe('signedIn');
  });

  it('nunca grava o token no armazenamento do navegador', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const { session, answer } = setup();
    session.login('a@x.com', 'senha-com-dez').subscribe();
    session.refresh().subscribe();
    answer(0, T2);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
