import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PinType } from '../../core/models/pin.model';

export interface LegendItem {
  type: PinType;
  label: string;
  code: string;
  color: string;
  count: number;
  hidden: boolean;
}

/** Legenda dos tipos de elemento, com contagem e visibilidade alternável. */
@Component({
  selector: 'app-map-legend',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './map-legend.html',
  styleUrl: './map-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLegendComponent {
  readonly items = input<readonly LegendItem[]>([]);
  readonly total = input(0);

  readonly toggleType = output<PinType>();
  readonly close = output<void>();
}
