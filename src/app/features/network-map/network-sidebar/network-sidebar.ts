import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapTool } from '../../../core/models/geo.model';

/**
 * Barra lateral do mapeador.
 *
 * A listagem de elementos e cabos foi movida para a legenda sobre o mapa.
 * Este painel fica, por ora, apenas recolhível: o espaço está reservado para
 * os cadastros do sistema (tipos de cabo, CTO e equipamentos).
 */
@Component({
  selector: 'app-network-sidebar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './network-sidebar.html',
  styleUrl: './network-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-collapsed]': 'collapsed()',
  },
})
export class NetworkSidebarComponent {
  readonly activeTool = input<MapTool>('select');

  protected readonly collapsed = signal(false);
  protected readonly isCreating = computed(
    () => this.activeTool() === 'addPin' || this.activeTool() === 'addCable',
  );

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }
}
