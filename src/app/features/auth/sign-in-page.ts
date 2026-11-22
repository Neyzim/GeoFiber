import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { safeReturnUrl } from '../../core/auth/auth-guards';
import { AuthSession } from '../../core/auth/auth-session';

/** Textos próprios para os campos (o Bean Validation responde em inglês). */
const FIELD_TEXT: Record<string, string> = {
  email: 'Informe um e-mail válido.',
  password: 'Informe a senha.',
};

/** Página `/entrar`: login por e-mail e senha; sem conexão, o aviso com "Tentar novamente". */
@Component({
  selector: 'app-sign-in-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  protected readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly expired = this.query.get('expirou') === '1';
  private readonly returnUrl = safeReturnUrl(this.query.get('voltar'));

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly retrying = signal(false);

  protected submit(): void {
    if (this.sending()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.sending.set(true);
    this.error.set(null);
    this.session.login(email.trim(), password).subscribe({
      next: () => {
        this.sending.set(false);
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: (error: ApiError) => {
        this.sending.set(false);
        this.showError(error);
      },
    });
  }

  protected retry(): void {
    this.retrying.set(true);
    void this.session.start().then((status) => {
      this.retrying.set(false);
      if (status === 'signedIn') void this.router.navigateByUrl(this.returnUrl);
    });
  }

  private showError(error: ApiError): void {
    const fields = Object.keys(error.fieldErrors);
    if (fields.length === 0) {
      this.error.set(error.message);
      return;
    }
    for (const field of fields) {
      const control = this.form.get(field);
      if (control) control.setErrors({ api: FIELD_TEXT[field] ?? error.fieldErrors[field] });
      else this.error.set(error.message);
    }
  }
}
