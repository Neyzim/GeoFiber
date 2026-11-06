import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Cable } from '../../../core/models/cable.model';
import { MapTool } from '../../../core/models/geo.model';
import { PIN_STATUSES, Pin, PinStatus } from '../../../core/models/pin.model';
import { CableListComponent } from '../../../shared/cable/cable-list';
import { PinListComponent } from '../../../shared/pin/pin-list';

export type SidebarListMode = 'pins' | 'cables';

/**
 * Barra lateral do mapeador: identidade, busca, filtros e as listas de
 * PINs/cabos. É um componente de apresentação — recebe os dados por `input` e
 * devolve as intenções do usuário por `output`; o modo da lista e o estado
 * recolhido são os únicos estados puramente de UI mantidos aqui.
 */
@Component({
  selector: 'app-network-sidebar',
  imports: [
    CableListComponent,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    PinListComponent,
  ],
  templateUrl: './network-sidebar.html',
  styleUrl: './network-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-collapsed]': 'collapsed()',
  },
})
export class NetworkSidebarComponent {
  readonly activeTool = input.required<MapTool>();
  readonly pins = input<readonly Pin[]>([]);
  readonly selectedPinId = input<string | null>(null);
  readonly cables = input<readonly Cable[]>([]);
  readonly selectedCableId = input<string | null>(null);
  readonly totalPins = input(0);
  readonly totalCables = input(0);
  readonly search = input('');
  readonly activeStatuses = input<readonly PinStatus[]>([]);
  readonly hasActiveFilters = input(false);

  readonly searchChange = output<string>();
  readonly clearSearch = output<void>();
  readonly statusChange = output<readonly PinStatus[]>();
  readonly clearFilters = output<void>();
  readonly pinSelect = output<Pin>();
  readonly pinEdit = output<Pin>();
  readonly pinRemove = output<Pin>();
  readonly cableSelect = output<Cable>();
  readonly cableEdit = output<Cable>();
  readonly cableRemove = output<Cable>();

  protected readonly statuses = PIN_STATUSES;
  protected readonly listMode = signal<SidebarListMode>('pins');
  protected readonly collapsed = signal(false);
  protected readonly isCreating = computed(
    () => this.activeTool() === 'addPin' || this.activeTool() === 'addCable',
  );

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected onListModeChange(event: MatButtonToggleChange): void {
    this.listMode.set(event.value as SidebarListMode);
  }

  /** Converte a seleção múltipla dos botões de situação em uma lista de status. */
  protected onStatusToggle(event: MatButtonToggleChange): void {
    const value = event.value;
    const statuses = Array.isArray(value) ? (value as PinStatus[]) : value ? [value as PinStatus] : [];
    this.statusChange.emit(statuses);
  }
}
