import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { UserResponse } from '../../core/api/api-types';
import { UserApi } from '../../core/api/resources/user-api';
import { AuthSession } from '../../core/auth/auth-session';
import { NotificationService } from '../../core/services/notification';
import { PasswordDialogComponent } from './password-dialog';

const maria: UserResponse = { id: 'u1', name: 'Maria Silva', email: 'maria@x.com', role: 'MEMBER', active: true };

function setup(user: UserResponse = maria) {
  const dialogRef = { close: vi.fn(), disableClose: false };
  const users = { resetPassword: vi.fn((): Observable<void> => of(undefined)) };
  const notifications = { apiError: vi.fn((error: unknown) => parseApiError(error)), success: vi.fn() };
  const session = { userId: () => 'u0', logout: vi.fn() };
  TestBed.configureTestingModule({
    imports: [PasswordDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { user } },
      { provide: AuthSession, useValue: session },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: UserApi, useValue: users },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const fixture = TestBed.createComponent(PasswordDialogComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const text = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');
  return { fixture, component, dialogRef, users, notifications, session, text };
}

describe('PasswordDialogComponent', { timeout: 20000 }, () => {
  it('mostra o nome da pessoa no título', () => {
    const { text } = setup();
    expect(text()).toContain('Trocar senha de Maria Silva');
  });

  it('recusa senha curta antes de enviar', () => {
    const { fixture, component, users, text } = setup();
    component.form.controls.password.setValue('123456789');
    component.submit();
    fixture.detectChanges();
    expect(users.resetPassword).not.toHaveBeenCalled();
    expect(text()).toContain('A senha precisa ter pelo menos 10 caracteres.');
  });

  it('troca a senha: trava o fechamento enquanto salva, avisa e fecha', () => {
    const { fixture, component, dialogRef, users, notifications, text } = setup();
    const pending = new Subject<void>();
    users.resetPassword.mockReturnValueOnce(pending);
    component.form.controls.password.setValue('senha-nova-123');
    component.submit();
    fixture.detectChanges();
    expect(users.resetPassword).toHaveBeenCalledWith('u1', 'senha-nova-123');
    expect(dialogRef.disableClose).toBe(true);
    expect(text()).toContain('Salvando...');
    pending.next();
    pending.complete();
    expect(notifications.success).toHaveBeenCalledWith(
      'Senha de Maria Silva trocada. Passe a nova senha para ela.',
    );
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('a própria senha: avisa que vai sair e encerra a sessão', () => {
    const me: UserResponse = { id: 'u0', name: 'Dono', email: 'dono@x.com', role: 'ADMIN', active: true };
    const { component, dialogRef, notifications, session, text } = setup(me);
    expect(text()).toContain('Depois de trocar, você sai e entra de novo com a senha nova.');
    component.form.controls.password.setValue('senha-nova-123');
    component.submit();
    expect(notifications.success).toHaveBeenCalledWith('Sua senha foi trocada. Entre de novo com a senha nova.');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(session.logout).toHaveBeenCalledTimes(1);
  });

  it('senha de outra pessoa não encerra a sua sessão', () => {
    const { component, session } = setup();
    component.form.controls.password.setValue('senha-nova-123');
    component.submit();
    expect(session.logout).not.toHaveBeenCalled();
  });

  it('erro 400: mensagem no campo e diálogo aberto', () => {
    const { fixture, component, dialogRef, users, text } = setup();
    const error = new HttpErrorResponse({
      status: 400,
      error: { status: 400, detail: 'A senha precisa ter pelo menos 10 caracteres.' },
    });
    users.resetPassword.mockReturnValueOnce(throwError(() => error));
    component.form.controls.password.setValue('senha-nova-123');
    component.submit();
    fixture.detectChanges();
    expect(component.form.controls.password.errors?.['api']).toBe(parseApiError(error).message);
    expect(text()).toContain(parseApiError(error).message);
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(dialogRef.disableClose).toBe(false);
  });
});
