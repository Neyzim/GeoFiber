import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TOOL_LABELS } from '../../core/constants/map.constants';
import { MapTool } from '../../core/models/geo.model';

interface ToolOption {
  tool: MapTool;
  icon: string;
  label: string;
  /** Ferramenta que altera a rede: exige `editable`. */
  creates: boolean;
}

/** Barra flutuante de ferramentas do mapa (seleção, criação e navegação). */
@Component({
  selector: 'app-map-toolbar',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './map-toolbar.html',
  styleUrl: './map-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapToolbarComponent {
  readonly activeTool = input<MapTool>('select');
  readonly showLayerPanel = input(false);
  readonly showLegend = input(false);
  /** Quantidade de elementos visíveis — habilita/desabilita ações dependentes. */
  readonly visibleCount = input(0);
  /** Libera as ferramentas de criação (rede carregada e permissão de edição). */
  readonly editable = input(true);

  /** Papel de quem entrou, em português ("Técnico", "Administrador"). */
  readonly roleLabel = input('');

  readonly toolChange = output<MapTool>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly locate = output<void>();
  readonly fitToPins = output<void>();
  readonly toggleLayerPanel = output<void>();
  readonly toggleLegend = output<void>();
  readonly signOut = output<void>();

  /** Ferramentas de seleção, criação e ajuste de posição (as de edição exigem `editable`). */
  protected readonly tools: readonly ToolOption[] = [
    { tool: 'select', icon: 'near_me', label: TOOL_LABELS.select, creates: false },
    { tool: 'addElement', icon: 'add_location_alt', label: TOOL_LABELS.addElement, creates: true },
    { tool: 'addCable', icon: 'timeline', label: TOOL_LABELS.addCable, creates: true },
    { tool: 'move', icon: 'open_with', label: TOOL_LABELS.move, creates: true },
    { tool: 'editCable', icon: 'polyline', label: TOOL_LABELS.editCable, creates: true },
  ];
}
