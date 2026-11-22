import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { TokenResponse } from '../api/api-types';
import { AuthApi } from './auth-api';
import { authInterceptor } from './auth.interceptor';
import { AuthSession } from './auth-session';

const BASE = 'http://api/v1';

interface FakeSession {
  current: string | null;
  token: () => string | null;
  refresh: ReturnType<typeof vi.fn<() => Observable<string>>>;
  expire: ReturnType<typeof vi.fn>;
}

function setup(session?: Partial<FakeSession>) {
  const fake: FakeSession = {
    current: 't1',
    token: () => fake.current,
    refresh: vi.fn(() => of('t2')),
    expire: vi.fn(),
    ...session,
  };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: AuthSession, useValue: fake },
    ],
  });
  return { http: TestBed.inject(HttpClient), mock: TestBed.inject(HttpTestingController), session: fake };
}

const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  it('põe o Bearer e envia o cookie nas chamadas à API', () => {
    const { http, mock } = setup();
    http.get(`${BASE}/boxes`).subscribe();
    const req = mock.expectOne(`${BASE}/boxes`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer t1');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('envia o cookie, sem Bearer, nas rotas de autenticação', () => {
    const { http, mock } = setup();
    http.post(`${BASE}/auth/refresh`, null).subscribe();
    const req = mock.expectOne(`${BASE}/auth/refresh`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('não mexe em chamadas fora da API (ex.: mapa)', () => {
    const { http, mock } = setup();
    http.get('https://tile.openstreetmap.org/1/1/1.png').subscribe();
    const req = mock.expectOne('https://tile.openstreetmap.org/1/1/1.png');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush('');
  });

  it('401: renova e repete uma vez com o token novo', () => {
    const { http, mock, session } = setup();
    let body: unknown;
    http.get(`${BASE}/boxes`).subscribe((value) => (body = value));
    mock.expectOne(`${BASE}/boxes`).flush(null, unauthorized);
    session.current = 't2';
    const retry = mock.expectOne(`${BASE}/boxes`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer t2');
    retry.flush(['ok']);
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(body).toEqual(['ok']);
  });

  it('repetição com 401 de novo encerra a sessão, sem laço', () => {
    const { http, mock, session } = setup();
    let status = 0;
    http.get(`${BASE}/boxes`).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
    mock.expectOne(`${BASE}/boxes`).flush(null, unauthorized);
    mock.expectOne(`${BASE}/boxes`).flush(null, unauthorized);
    mock.expectNone(`${BASE}/boxes`);
    expect(session.expire).toHaveBeenCalledTimes(1);
    expect(status).toBe(401);
  });

  it('refresh sem conexão: quem chamou recebe o erro de conexão e a sessão continua', () => {
    const offline = new HttpErrorResponse({ status: 0 });
    const { http, mock, session } = setup({ refresh: vi.fn(() => throwError(() => offline)) });
    let status = -1;
    http.get(`${BASE}/boxes`).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
    mock.expectOne(`${BASE}/boxes`).flush(null, unauthorized);
    expect(status).toBe(0);
    expect(session.expire).not.toHaveBeenCalled();
  });

  it('401 no login passa direto, sem renovar', () => {
    const { http, mock, session } = setup();
    let status = 0;
    http.post(`${BASE}/auth/login`, {}).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
    mock.expectOne(`${BASE}/auth/login`).flush(null, unauthorized);
    expect(status).toBe(401);
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it('três 401 ao mesmo tempo com a sessão real: um só refresh e as três repetem', () => {
    const refresh = new Subject<TokenResponse>();
    const api = { refresh: vi.fn(() => refresh), login: vi.fn(), logout: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: AuthApi, useValue: api },
        { provide: Router, useValue: { url: '/', navigate: vi.fn() } },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const mock = TestBed.inject(HttpTestingController);
    const done: string[] = [];
    for (const path of ['olts', 'boxes', 'cables']) {
      http.get(`${BASE}/${path}`).subscribe(() => done.push(path));
    }
    for (const path of ['olts', 'boxes', 'cables']) {
      mock.expectOne(`${BASE}/${path}`).flush(null, unauthorized);
    }
    expect(api.refresh).toHaveBeenCalledTimes(1);
    refresh.next({ accessToken: 'novo', expiresIn: 900 });
    refresh.complete();
    for (const path of ['olts', 'boxes', 'cables']) {
      const retry = mock.expectOne(`${BASE}/${path}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer novo');
      retry.flush([]);
    }
    expect(done.sort()).toEqual(['boxes', 'cables', 'olts']);
  });
});
