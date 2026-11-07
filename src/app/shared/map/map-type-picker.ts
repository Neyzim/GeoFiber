import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TypePickerOption {
  /** Identificador do tipo (`PinType` ou `CableType`). */
  key: string;
  label: string;
  code: string;
  color: string;
  count: number;
}

/**
 * Paleta de tipos usada pelas ferramentas de criação.
 *
 * Mostra os tipos disponíveis (elementos ou cabos), destaca o tipo ativo e
 * comunica a intenção de escolha por `output` — o componente não conhece o
 * domínio, apenas a lista que recebe.
 */
@Component({
  selector: 'app-map-type-picker',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './map-type-picker.html',
  styleUrl: './map-type-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapTypePickerComponent {
  readonly title = input('Tipo');
  readonly hint = input('');
  readonly options = input<readonly TypePickerOption[]>([]);
  readonly activeKey = input<string | null>(null);
  /** `cable` desenha a amostra como uma linha, em vez de um selo com código. */
  readonly sample = input<'pin' | 'cable'>('pin');

  readonly pick = output<string>();
  readonly close = output<void>();
}
