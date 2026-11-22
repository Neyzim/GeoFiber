import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UserResponse } from '../../core/api/api-types';
import { UserApi } from '../../core/api/resources/user-api';
import { AuthSession } from '../../core/auth/auth-session';
import { NotificationService } from '../../core/services/notification';
import { MIN_PASSWORD } from './user-form-dialog';

export interface PasswordDialogData {
  user: UserResponse;
}

/** Administrador define uma senha nova (temporária) para alguém. Fecha com `true` ao salvar. */
@Component({
  selector: 'app-password-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './password-dialog.html',
  styleUrl: './password-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordDialogComponent {
  protected readonly user = inject<PasswordDialogData>(MAT_DIALOG_DATA).user;
  private readonly dialogRef = inject(MatDialogRef<PasswordDialogComponent, boolean>);
  private readonly users = inject(UserApi);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(AuthSession);
  /** A própria senha: o backend encerra as sessões, inclusive esta. */
  protected readonly isMe = this.user.id === this.session.userId();

  protected readonly minPassword = MIN_PASSWORD;
  readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_PASSWORD)],
    }),
  });
  protected readonly saving = signal(false);
  protected readonly showPassword = signal(false);

  protected cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.saving() || !this.user.id) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    // Enquanto salva, ESC e clique fora não fecham.
    this.dialogRef.disableClose = true;
    this.users.resetPassword(this.user.id, this.form.controls.password.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
        if (this.isMe) {
          this.notifications.success('Sua senha foi trocada. Entre de novo com a senha nova.');
          this.session.logout();
        } else {
          this.notifications.success(`Senha de ${this.user.name} trocada. Passe a nova senha para ela.`);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        const parsed = this.notifications.apiError(error);
        if (parsed.status === 400) {
          const control = this.form.controls.password;
          control.setErrors({ ...control.errors, api: parsed.fieldErrors['password'] ?? parsed.message });
          control.markAsTouched();
        }
      },
    });
  }
}
