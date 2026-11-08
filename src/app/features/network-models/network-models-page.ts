import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import {
  NETWORK_MODEL_KINDS,
  NetworkModel,
  NetworkModelDraft,
  NetworkModelKind,
  networkModelSummary,
} from '../../core/models/network-model.model';
import { NetworkModelStoreService } from '../../core/services/network-model-store';
import { NotificationService } from '../../core/services/notification';
import { ThemeService } from '../../core/services/theme';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { ModelFormDialogComponent, ModelFormDialogData } from './model-form-dialog';

/**
 * Página de cadastro de modelos de cabo/CTO/CEO.
 *
 * É a fonte dos parâmetros usados na criação dos elementos no mapa: cada
 * modelo guarda cor, fibras, portas ou emendas que parametrizam os elementos
 * vinculados por `modelId`.
 */
@Component({
  selector: 'app-network-models-page',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './network-models-page.html',
  styleUrl: './network-models-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkModelsPage {
  private readonly store = inject(NetworkModelStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly theme = inject(ThemeService);

  protected readonly isDark = this.theme.isDark;
  protected readonly total = this.store.total;
  protected readonly sections = computed(() =>
    NETWORK_MODEL_KINDS.map((definition) => ({
      definition,
      models: this.store.modelsOfKind(definition.kind),
    })),
  );

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected summary(model: NetworkModel): string {
    return networkModelSummary(model);
  }

  protected create(kind?: NetworkModelKind): void {
    this.openForm({ kind });
  }

  protected edit(model: NetworkModel): void {
    this.openForm({ model });
  }

  protected remove(model: NetworkModel): void {
    this.confirm({
      title: 'Remover modelo',
      message: `Remover "${model.name}"? Os elementos vinculados deixarão de usar este modelo.`,
      confirmLabel: 'Remover',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.remove(model.id);
      this.notifications.success(`Modelo "${model.name}" removido.`);
    });
  }

  protected restoreDefaults(): void {
    this.store.restoreDefaults();
    this.notifications.success('Modelos padrão restaurados.');
  }

  private openForm(data: ModelFormDialogData): void {
    this.dialog
      .open<ModelFormDialogComponent, ModelFormDialogData, NetworkModelDraft>(ModelFormDialogComponent, {
        data,
        width: '600px',
        maxWidth: '94vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((draft) => {
        if (!draft) {
          return;
        }
        if (data.model) {
          this.store.update(data.model.id, draft);
          this.notifications.success(`Modelo "${draft.name}" atualizado.`);
          return;
        }
        this.store.add(draft);
        this.notifications.success(`Modelo "${draft.name}" cadastrado.`);
      });
  }

  private confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}
