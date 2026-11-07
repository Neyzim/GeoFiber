import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface LegendItem {
  /** Tipo do elemento (`PinType` ou `CableType`). */
  key: string;
  kind: 'pin' | 'cable';
  label: string;
  code: string;
  color: string;
  count: number;
  hidden: boolean;
  /** Cabos tracejados são exibidos com traço interrompido na legenda. */
  dashed?: boolean;
}

/** Legenda dos elementos e cabos, com contagem e visibilidade alternável. */
@Component({
  selector: 'app-map-legend',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './map-legend.html',
  styleUrl: './map-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapLegendComponent {
  readonly pinItems = input<readonly LegendItem[]>([]);
  readonly cableItems = input<readonly LegendItem[]>([]);
  readonly totalPins = input(0);
  readonly totalCables = input(0);

  readonly toggleItem = output<LegendItem>();
  readonly close = output<void>();
}
