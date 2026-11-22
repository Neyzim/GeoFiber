import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { UserApi } from '../../core/api/resources/user-api';
import { NotificationService } from '../../core/services/notification';
import { UserFormDialogComponent } from './user-form-dialog';

const SAVED = { id: 'u9', name: 'Ana', email: 'ana@x.com', role: 'MEMBER' as const, active: true };

function setup() {
  const close = vi.fn();
  const users = { create: vi.fn(() => of(SAVED)) };
  const notifications = { apiError: vi.fn((error: unknown) => parseApiError(error)), success: vi.fn() };
  TestBed.configureTestingModule({
    imports: [UserFormDialogComponent],
    providers: [
      { provide: MatDialogRef, useValue: { close, disableClose: false } },
      { provide: UserApi, useValue: users },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const fixture = TestBed.createComponent(UserFormDialogComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const fill = (password = 'senha-com-dez') =>
    component.form.patchValue({ name: 'Ana', email: 'ana@x.com', password });
  const text = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
  return { fixture, component, close, users, notifications, fill, text };
}

function http(status: number, detail: string) {
  return new HttpErrorResponse({ status, error: { status, detail } });
}

describe('UserFormDialogComponent', { timeout: 20000 }, () => {
  it('recusa senha curta antes de enviar', () => {
    const { fixture, component, users, fill, text } = setup();
    fill('curta');
    component.submit();
    fixture.detectChanges();
    expect(text()).toContain('A senha precisa ter pelo menos 10 caracteres.');
    expect(users.create).not.toHaveBeenCalled();
  });

  it('cadastra como técnico por padrão, avisa e fecha com o usuário', () => {
    const { component, users, notifications, close, fill } = setup();
    fill();
    component.submit();
    expect(users.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@x.com',
      password: 'senha-com-dez',
      role: 'MEMBER',
    });
    expect(notifications.success).toHaveBeenCalledWith('Usuário Ana cadastrado.');
    expect(close).toHaveBeenCalledWith(SAVED);
  });

  it('e-mail repetido: erro no campo e diálogo aberto', () => {
    const { component, users, close, fill } = setup();
    users.create.mockReturnValueOnce(throwError(() => http(409, 'E-mail já cadastrado.')));
    fill();
    component.submit();
    expect(component.form.controls.email.errors?.['api']).toBe('E-mail já cadastrado.');
    expect(component.form.controls.name.value).toBe('Ana');
    expect(close).not.toHaveBeenCalled();
  });

  it('senha curta pelo servidor: erro no campo senha', () => {
    const { component, users, fill } = setup();
    users.create.mockReturnValueOnce(
      throwError(() => http(400, 'A senha precisa ter pelo menos 10 caracteres.')),
    );
    fill();
    component.submit();
    expect(component.form.controls.password.errors?.['api']).toBe(
      'A senha precisa ter pelo menos 10 caracteres.',
    );
  });

  it('mostra os papéis em português', () => {
    const { text } = setup();
    expect(text()).toContain('Técnico');
    expect(text()).toContain('Administrador');
    expect(text()).not.toMatch(/ADMIN|MEMBER/);
  });
});
