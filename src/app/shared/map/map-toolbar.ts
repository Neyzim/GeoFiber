import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TOOL_LABELS } from '../../core/constants/map.constants';
import { MapTool } from '../../core/models/geo.model';

interface ToolOption {
  tool: MapTool;
  icon: string;
  label: string;
}

/** Barra flutuante de ferramentas do mapa (seleção, criação de PIN e navegação). */
@Component({
  selector: 'app-map-toolbar',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatTooltipModule],
  templateUrl: './map-toolbar.html',
  styleUrl: './map-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapToolbarComponent {
  readonly activeTool = input<MapTool>('select');
  readonly showLayerPanel = input(false);
  readonly showLegend = input(false);
  /** Quantidade de PINs visíveis — habilita/desabilita ações dependentes. */
  readonly visibleCount = input(0);

  readonly toolChange = output<MapTool>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly locate = output<void>();
  readonly fitToPins = output<void>();
  readonly toggleLayerPanel = output<void>();
  readonly toggleLegend = output<void>();
  readonly clearAll = output<void>();

  /**
   * Ferramentas de criação/seleção. As ações de mover ficam nos diálogos de
   * edição de cada elemento (PIN/cabo), por isso não aparecem aqui.
   */
  protected readonly tools: readonly ToolOption[] = [
    { tool: 'select', icon: 'near_me', label: TOOL_LABELS.select },
    { tool: 'addPin', icon: 'add_location_alt', label: TOOL_LABELS.addPin },
    { tool: 'addCable', icon: 'timeline', label: TOOL_LABELS.addCable },
  ];
}
