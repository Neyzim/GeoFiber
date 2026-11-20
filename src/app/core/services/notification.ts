import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError, parseApiError } from '../api/api-error';

export type NotificationKind = 'success' | 'info' | 'warning' | 'error';

/** Wrapper de avisos ao usuário, centralizando estilo e duração das mensagens. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  /** Mostra o erro da API em português e devolve os detalhes (ex.: erros por campo). */
  apiError(error: unknown): ApiError {
    const parsed = parseApiError(error);
    this.error(parsed.message);
    return parsed;
  }

  private show(message: string, kind: NotificationKind, duration = 3200): void {
    this.snackBar.open(message, 'Fechar', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [`gf-snack-${kind}`],
    });
  }
}
