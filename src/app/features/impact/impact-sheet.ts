import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { SheetDragDirective } from '../../shared/common/sheet-drag.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImpactBox } from '../../core/api/impact-types';
import { summaryLine, totalsLine, truncatedNote } from '../../core/network/impact-view';
import { ImpactStore } from './impact-store';

/**
 * Ficha do impacto de manutenção: quem fica sem sinal se o item sair ou parar, agrupado por caixa.
 * Usa o `ImpactStore` provido pela página do mapa. Só leitura.
 */
@Component({
  selector: 'app-impact-sheet',
  imports: [SheetDragDirective, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './impact-sheet.html',
  styleUrls: ['../network-map/sheet-frame.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpactSheetComponent {
  readonly store = inject(ImpactStore);
  readonly closed = output<void>();
  /** Clicar numa caixa da lista: a página enquadra a caixa no mapa. */
  readonly focusBox = output<string>();

  protected readonly title = 'Impacto de manutenção';
  protected readonly summary = computed(() => {
    const response = this.store.response();
    return response ? summaryLine(response) : '';
  });
  protected readonly totals = computed(() => {
    const response = this.store.response();
    return response?.totals ? totalsLine(response.totals) : '';
  });
  protected readonly truncated = computed(() => {
    const response = this.store.response();
    return response ? truncatedNote(response) : null;
  });
  protected readonly boxes = computed<readonly ImpactBox[]>(() => this.store.response()?.boxes ?? []);

  protected customerName(name: string | null | undefined): string {
    return name || '(sem nome)';
  }
}
