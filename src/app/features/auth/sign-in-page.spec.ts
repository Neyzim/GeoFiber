import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { AuthSession, SessionStatus } from '../../core/auth/auth-session';
import { SignInPage } from './sign-in-page';

function apiError(partial: Partial<ApiError>): ApiError {
  return { status: 400, message: '', fieldErrors: {}, original: null, ...partial };
}

function render(query: Record<string, string> = {}, status: SessionStatus = 'signedOut') {
  const session = {
    status: signal<SessionStatus>(status),
    login: vi.fn((): Observable<void> => of(undefined)),
    start: vi.fn(() => Promise.resolve<SessionStatus>('signedOut')),
  };
  const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    imports: [SignInPage],
    providers: [
      { provide: AuthSession, useValue: session },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(SignInPage);
  fixture.detectChanges();
  return { fixture, session, router };
}

type Fixture = ComponentFixture<SignInPage>;
const root = (fixture: Fixture) => fixture.nativeElement as HTMLElement;
const text = (fixture: Fixture) => (root(fixture).textContent ?? '').replace(/\s+/g, ' ');

function type(fixture: Fixture, name: string, value: string) {
  const input = root(fixture).querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submit(fixture: Fixture) {
  root(fixture).querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

describe('SignInPage', { timeout: 20000 }, () => {
  it('avisa que a sessão expirou', () => {
    const { fixture } = render({ expirou: '1' });
    expect(root(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Sua sessão expirou. Entre novamente.',
    );
  });

  it('pede e-mail e senha antes de enviar', () => {
    const { fixture, session } = render();
    submit(fixture);
    expect(text(fixture)).toContain('Informe um e-mail válido.');
    expect(text(fixture)).toContain('Informe a senha.');
    expect(session.login).not.toHaveBeenCalled();
  });

  it('entra e volta para onde estava', () => {
    const { fixture, session, router } = render({ voltar: '/caixas/b1/fusoes' });
    type(fixture, 'email', 'ana@x.com');
    type(fixture, 'password', 'senha-com-dez');
    submit(fixture);
    expect(session.login).toHaveBeenCalledWith('ana@x.com', 'senha-com-dez');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/caixas/b1/fusoes');
  });

  it('ignora volta para fora do app', () => {
    const { fixture, router } = render({ voltar: '//site.com' });
    type(fixture, 'email', 'ana@x.com');
    type(fixture, 'password', 'senha-com-dez');
    submit(fixture);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('credenciais erradas: mensagem do backend e campos mantidos', () => {
    const { fixture, session } = render();
    session.login.mockReturnValueOnce(
      throwError(() => apiError({ status: 401, message: 'Credenciais inválidas ou sessão expirada.' })),
    );
    type(fixture, 'email', 'ana@x.com');
    type(fixture, 'password', 'errada-123');
    submit(fixture);
    expect(root(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'Credenciais inválidas ou sessão expirada.',
    );
    expect(root(fixture).querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('ana@x.com');
  });

  it('troca a mensagem em inglês do campo pelo texto próprio', () => {
    const { fixture, session } = render();
    session.login.mockReturnValueOnce(
      throwError(() =>
        apiError({ message: 'Verifique os campos destacados.', fieldErrors: { email: 'must be a well-formed email address' } }),
      ),
    );
    type(fixture, 'email', 'ana@x.com');
    type(fixture, 'password', 'senha-com-dez');
    submit(fixture);
    expect(text(fixture)).toContain('Informe um e-mail válido.');
    expect(text(fixture)).not.toContain('must be');
  });

  it('sem conexão: frase e Tentar novamente', () => {
    const { fixture, session } = render({}, 'offline');
    expect(text(fixture)).toContain('Não foi possível conectar ao servidor do GeoFiber.');
    expect(root(fixture).querySelector('form')).toBeNull();
    root(fixture).querySelector<HTMLElement>('[data-action="tentar-de-novo"]')!.click();
    expect(session.start).toHaveBeenCalled();
  });

  it('nenhum código do backend na tela', () => {
    const { fixture } = render();
    expect(text(fixture)).not.toMatch(/ADMIN|MEMBER/);
  });
});
