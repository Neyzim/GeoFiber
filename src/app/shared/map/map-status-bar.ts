import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TOOL_LABELS } from '../../core/constants/map.constants';
import { GeoPoint, MapTool, MapViewState } from '../../core/models/geo.model';
import { CoordinatePipe } from '../pipes/coordinate-pipe';

/** Barra inferior com coordenadas do cursor, zoom e contadores do projeto. */
@Component({
  selector: 'app-map-status-bar',
  imports: [CoordinatePipe],
  templateUrl: './map-status-bar.html',
  styleUrl: './map-status-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapStatusBarComponent {
  readonly pointer = input<GeoPoint | null>(null);
  readonly view = input<MapViewState | null>(null);
  readonly totalPins = input(0);
  readonly visiblePins = input(0);
  readonly totalCables = input(0);
  readonly visibleCables = input(0);
  readonly activeTool = input<MapTool>('select');
  readonly crs = input('EPSG:4326 (WGS 84)');

  protected toolLabel(): string {
    return TOOL_LABELS[this.activeTool()];
  }
}
