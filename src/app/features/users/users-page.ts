import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { UserResponse } from '../../core/api/api-types';
import { AuthSession } from '../../core/auth/auth-session';
import { roleText } from '../../core/auth/roles';
import { PasswordDialogComponent, PasswordDialogData } from '../../shared/users/password-dialog';
import { UserFormDialogComponent } from '../../shared/users/user-form-dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { UsersStore } from './users-store';

/** `/usuarios`: o administrador vê as contas, desativa quem saiu e troca senhas esquecidas. */
@Component({
  selector: 'app-users-page',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  providers: [UsersStore],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage implements OnInit {
  protected readonly store = inject(UsersStore);
  private readonly session = inject(AuthSession);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.store.load();
  }

  protected isMe(user: UserResponse): boolean {
    return user.id === this.session.userId();
  }

  protected summary(user: UserResponse): string {
    return `${roleText(user.role ?? null)} · ${user.active ? 'Ativa' : 'Desativada'}`;
  }

  protected deactivate(user: UserResponse): void {
    const data: ConfirmDialogData = {
      title: `Desativar ${user.name}?`,
      message: 'Ela sai do sistema em até 15 minutos e não consegue entrar de novo até ser reativada.',
      confirmLabel: 'Desativar',
      danger: true,
    };
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) this.store.setActive(user, false);
      });
  }

  protected reactivate(user: UserResponse): void {
    this.store.setActive(user, true);
  }

  protected changePassword(user: UserResponse): void {
    this.dialog.open<PasswordDialogComponent, PasswordDialogData, boolean>(PasswordDialogComponent, {
      data: { user },
      width: '440px',
      maxWidth: '92vw',
    });
  }

  protected create(): void {
    this.dialog
      .open<UserFormDialogComponent, unknown, UserResponse>(UserFormDialogComponent, {
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.store.load();
      });
  }
}
