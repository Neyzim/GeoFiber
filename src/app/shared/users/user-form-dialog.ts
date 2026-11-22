import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { UserResponse, UserRole } from '../../core/api/api-types';
import { applyFieldErrors } from '../../core/api/form-errors';
import { UserApi } from '../../core/api/resources/user-api';
import { roleText } from '../../core/auth/roles';
import { NotificationService } from '../../core/services/notification';

export const MIN_PASSWORD = 10;

/** Cadastro de usuário pelo administrador (nome, e-mail, senha e papel). Fecha com o usuário criado. */
@Component({
  selector: 'app-user-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    ReactiveFormsModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent, UserResponse>);
  private readonly users = inject(UserApi);
  private readonly notifications = inject(NotificationService);

  protected readonly roles: readonly { value: UserRole; label: string }[] = [
    { value: 'MEMBER', label: roleText('MEMBER') },
    { value: 'ADMIN', label: roleText('ADMIN') },
  ];
  protected readonly minPassword = MIN_PASSWORD;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_PASSWORD)],
    }),
    role: new FormControl<UserRole>('MEMBER', { nonNullable: true }),
  });
  protected readonly saving = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly extraErrors = signal<string[]>([]);

  protected cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const name = value.name.trim();
    this.saving.set(true);
    // Enquanto salva, ESC e clique fora não fecham.
    this.dialogRef.disableClose = true;
    this.extraErrors.set([]);
    this.users.create({ name, email: value.email.trim(), password: value.password, role: value.role }).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.notifications.success(`Usuário ${user.name ?? name} cadastrado.`);
        this.dialogRef.close(user);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        const parsed = this.notifications.apiError(error);
        const unmatched = applyFieldErrors(this.form, parsed.fieldErrors);
        // Erros sem campo que o backend devolve só como `detail`.
        if (parsed.status === 409) this.markApi('email', parsed.message);
        else if (parsed.status === 400 && Object.keys(parsed.fieldErrors).length === 0) {
          this.markApi('password', parsed.message);
        }
        this.extraErrors.set(unmatched);
      },
    });
  }

  private markApi(field: 'email' | 'password', message: string): void {
    const control = this.form.controls[field];
    control.setErrors({ ...control.errors, api: message });
    control.markAsTouched();
  }
}
