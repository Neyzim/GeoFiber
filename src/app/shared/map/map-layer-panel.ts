import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BASE_LAYERS, MIN_BASE_LAYER_OPACITY, BaseLayerDefinition } from '../../core/constants/map.constants';

/** Painel de escolha da camada base (mapa de fundo) e sua opacidade. */
@Component({
  selector: 'app-map-layer-panel',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  templateUrl: './map-layer-panel.html',
  styleUrl: './map-layer-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLayerPanelComponent {
  readonly layers = input<readonly BaseLayerDefinition[]>(BASE_LAYERS);
  readonly activeKey = input('');
  readonly opacity = input(1);

  readonly layerChange = output<string>();
  readonly opacityChange = output<number>();
  readonly close = output<void>();

  protected readonly minOpacity = MIN_BASE_LAYER_OPACITY;
}
