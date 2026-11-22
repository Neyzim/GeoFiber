import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { UserResponse } from '../../core/api/api-types';
import { UserApi } from '../../core/api/resources/user-api';
import { NotificationService } from '../../core/services/notification';
import { UsersStore } from './users-store';

const maria: UserResponse = { id: 'u1', name: 'Maria Silva', email: 'maria@x.com', role: 'MEMBER', active: true };
const joao: UserResponse = { id: 'u2', name: 'João Souza', email: 'joao@x.com', role: 'MEMBER', active: false };

function setup() {
  const api = {
    list: vi.fn(() => of([joao, maria])),
    setActive: vi.fn((id: string, active: boolean): Observable<UserResponse> => of({ ...(id === 'u1' ? maria : joao), active })),
  };
  const notifications = { success: vi.fn(), apiError: vi.fn((error: unknown) => parseApiError(error)) };
  TestBed.configureTestingModule({
    providers: [
      UsersStore,
      { provide: UserApi, useValue: api },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { store: TestBed.inject(UsersStore), api, notifications };
}

describe('UsersStore', () => {
  it('carrega a lista na ordem recebida', () => {
    const { store, api } = setup();
    const response = new Subject<UserResponse[]>();
    api.list.mockReturnValueOnce(response);
    store.load();
    expect(store.loading()).toBe(true);
    response.next([joao, maria]);
    response.complete();
    expect(store.loading()).toBe(false);
    expect(store.users()).toEqual([joao, maria]);
    expect(store.loadError()).toBeNull();
  });

  it('erro ao carregar limpa a lista e guarda a mensagem', () => {
    const { store, api } = setup();
    store.load();
    const error = new HttpErrorResponse({ status: 500 });
    api.list.mockReturnValueOnce(throwError(() => error));
    store.load();
    expect(store.users()).toEqual([]);
    expect(store.loadError()).toBe(parseApiError(error).message);
    expect(store.loading()).toBe(false);
  });

  it('desativa e reativa com aviso e recarrega a lista', () => {
    const { store, api, notifications } = setup();
    store.load();
    store.setActive(maria, false);
    expect(api.setActive).toHaveBeenCalledWith('u1', false);
    expect(notifications.success).toHaveBeenCalledWith('Conta de Maria Silva desativada.');
    expect(api.list).toHaveBeenCalledTimes(2);
    store.setActive(joao, true);
    expect(notifications.success).toHaveBeenCalledWith('Conta de João Souza reativada.');
    expect(api.list).toHaveBeenCalledTimes(3);
    expect(store.busyId()).toBeNull();
  });

  it('erro 409 mostra o aviso e mantém a lista', () => {
    const { store, api, notifications } = setup();
    store.load();
    const error = new HttpErrorResponse({
      status: 409,
      error: { status: 409, detail: 'Você não pode desativar a própria conta.' },
    });
    api.setActive.mockReturnValueOnce(throwError(() => error));
    store.setActive(maria, false);
    expect(notifications.apiError).toHaveBeenCalledWith(error);
    expect(store.users()).toEqual([joao, maria]);
    expect(store.busyId()).toBeNull();
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('uma recarga nova descarta a resposta da anterior', () => {
    const { store, api } = setup();
    const first = new Subject<UserResponse[]>();
    const second = new Subject<UserResponse[]>();
    api.list.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.load();
    store.load();
    second.next([maria]);
    second.complete();
    first.next([joao, maria]);
    first.complete();
    expect(store.users()).toEqual([maria]);
  });

  it('ignora outro clique enquanto uma troca está em andamento', () => {
    const { store, api } = setup();
    store.load();
    const pending = new Subject<UserResponse>();
    api.setActive.mockReturnValueOnce(pending);
    store.setActive(maria, false);
    expect(store.busyId()).toBe('u1');
    store.setActive(maria, false);
    store.setActive(joao, true);
    expect(api.setActive).toHaveBeenCalledTimes(1);
  });
});
