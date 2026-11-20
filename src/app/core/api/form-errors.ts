import { FormGroup } from '@angular/forms';

/**
 * Aplica os erros de validação do backend nos campos do formulário (erro `api`).
 * Devolve as mensagens dos campos que não existem no formulário, para exibir à parte.
 */
export function applyFieldErrors(form: FormGroup, fieldErrors: Record<string, string>): string[] {
  const unmatched: string[] = [];
  for (const [field, message] of Object.entries(fieldErrors)) {
    const control = form.get(field);
    if (!control) {
      unmatched.push(message);
      continue;
    }
    control.setErrors({ ...control.errors, api: message });
    control.markAsTouched();
  }
  return unmatched;
}
