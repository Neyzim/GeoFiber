import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { parseApiError } from '../../core/api/api-error';
import { UserResponse } from '../../core/api/api-types';
import { UserApi } from '../../core/api/resources/user-api';
import { NotificationService } from '../../core/services/notification';

/**
 * Lista de usuários da página `/usuarios`. Escritas pessimistas: a lista só muda depois que o
 * backend confirma, recarregando tudo. Uma troca de situação por vez.
 */
@Injectable()
export class UsersStore {
  private readonly api = inject(UserApi);
  private readonly notifications = inject(NotificationService);

  private readonly _users = signal<readonly UserResponse[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal<string | null>(null);
  private readonly _busyId = signal<string | null>(null);
  /** Só a recarga mais recente vale: uma nova cancela a anterior. */
  private loading$: Subscription | null = null;

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  /** Usuário cuja situação está sendo trocada agora. */
  readonly busyId = this._busyId.asReadonly();

  load(): void {
    this.loading$?.unsubscribe();
    this._loading.set(true);
    this._loadError.set(null);
    this.loading$ = this.api.list().subscribe({
      next: (users) => {
        this._users.set(users);
        this._loading.set(false);
      },
      error: (error: unknown) => {
        this._users.set([]);
        this._loadError.set(parseApiError(error).message);
        this._loading.set(false);
      },
    });
  }

  setActive(user: UserResponse, active: boolean): void {
    if (this._busyId() !== null || !user.id) return;
    this._busyId.set(user.id);
    this.api.setActive(user.id, active).subscribe({
      next: () => {
        this._busyId.set(null);
        this.notifications.success(`Conta de ${user.name} ${active ? 'reativada' : 'desativada'}.`);
        this.load();
      },
      error: (error: unknown) => {
        this._busyId.set(null);
        this.notifications.apiError(error);
      },
    });
  }
}
