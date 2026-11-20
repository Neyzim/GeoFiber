import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfrastructureStatus } from '../../core/api/api-types';
import { INFRA_STATUSES } from '../../core/network/network-catalog';

/** Item individual da árvore: um elemento (OLT, caixa, cliente) ou um cabo. */
export interface LegendLeaf {
  /** `MapElement.key` para elementos; id do cabo para cabos. */
  id: string;
  kind: 'element' | 'cable';
  label: string;
  statusColor: string;
  statusLabel: string;
  /** Mostra as ações de editar/remover (clientes são só leitura). */
  editable: boolean;
}

/** Grupo de um tipo de elemento ou função de cabo, com seus itens. */
export interface LegendGroup {
  /** Grupo do elemento (`olt`, `CTO`...) ou função do cabo (`FEEDER`...). */
  key: string;
  kind: 'element' | 'cable';
  label: string;
  code: string;
  color: string;
  count: number;
  hidden: boolean;
  dashed?: boolean;
  items: readonly LegendLeaf[];
}

/** Bloco da árvore (Elementos ou Cabos). */
export interface LegendSection {
  key: string;
  label: string;
  total: number;
  groups: readonly LegendGroup[];
}

/**
 * Legenda sobre o mapa que também funciona como filtro e listagem.
 *
 * Os elementos são agrupados por tipo e os cabos por função; cada grupo pode
 * ser expandido para revelar os itens. O olho alterna a visibilidade (mapa + listagem) e o
 * clique em um item centraliza o elemento no mapa.
 */
@Component({
  selector: 'app-map-legend',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './map-legend.html',
  styleUrl: './map-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLegendComponent {
  readonly sections = input<readonly LegendSection[]>([]);
  readonly search = input('');
  readonly activeStatuses = input<readonly InfrastructureStatus[]>([]);
  readonly hasActiveFilters = input(false);

  readonly toggleGroup = output<LegendGroup>();
  readonly selectItem = output<LegendLeaf>();
  readonly editItem = output<LegendLeaf>();
  readonly removeItem = output<LegendLeaf>();
  readonly searchChange = output<string>();
  readonly statusChange = output<readonly InfrastructureStatus[]>();
  readonly clearFilters = output<void>();
  readonly close = output<void>();

  protected readonly statuses = INFRA_STATUSES;

  /** `true` quando não há nenhum grupo para exibir na árvore. */
  protected readonly isEmpty = computed(() =>
    this.sections().every((section) => section.groups.length === 0),
  );

  /** Chaves de grupo atualmente expandidas. */
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected isExpanded(key: string): boolean {
    return this.expanded().has(key);
  }

  protected toggleExpanded(key: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  /** Converte a seleção múltipla dos botões de situação em uma lista de status. */
  protected onStatusToggle(event: MatButtonToggleChange): void {
    const value = event.value;
    const statuses = Array.isArray(value)
      ? (value as InfrastructureStatus[])
      : value
        ? [value as InfrastructureStatus]
        : [];
    this.statusChange.emit(statuses);
  }
}
