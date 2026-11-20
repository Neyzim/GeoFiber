import { FormGroup } from '@angular/forms';
import { applyFieldErrors } from '../../core/api/form-errors';
import { NotificationService } from '../../core/services/notification';

/** Texto opcional: `undefined` quando vazio, para não enviar strings em branco. */
export function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Mostra o erro do servidor: marca os campos recusados e avisa o usuário.
 * Devolve as mensagens de campos que não existem no formulário.
 */
export function showSaveError(
  form: FormGroup,
  error: unknown,
  notifications: NotificationService,
): string[] {
  const parsed = notifications.apiError(error);
  return applyFieldErrors(form, parsed.fieldErrors);
}
