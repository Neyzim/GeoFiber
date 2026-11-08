import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { MapTool } from '../../../core/models/geo.model';
import { ThemeService } from '../../../core/services/theme';

/**
 * Barra lateral do mapeador.
 *
 * A listagem de elementos e cabos foi movida para a legenda sobre o mapa.
 * Este painel fica, por ora, apenas recolhível: o espaço está reservado para
 * os cadastros do sistema (tipos de cabo, CTO e equipamentos).
 */
@Component({
  selector: 'app-network-sidebar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './network-sidebar.html',
  styleUrl: './network-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-collapsed]': 'collapsed()',
  },
})
export class NetworkSidebarComponent {
  readonly activeTool = input<MapTool>('select');

  private readonly theme = inject(ThemeService);

  protected readonly collapsed = signal(false);
  protected readonly isDark = this.theme.isDark;
  protected readonly isCreating = computed(
    () => this.activeTool() === 'addPin' || this.activeTool() === 'addCable',
  );

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
