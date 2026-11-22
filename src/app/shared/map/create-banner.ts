import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Faixa no topo do mapa enquanto a pessoa cria algo, no lugar da janela de escolha do tipo:
 * "Criar CTO". Tocar nela reabre a escolha; o X encerra a criação.
 */
@Component({
  selector: 'app-create-banner',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './create-banner.html',
  styleUrl: './create-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateBannerComponent {
  /** O que está sendo criado, já em texto de tela ("CTO", "cabo de distribuição"). */
  readonly label = input.required<string>();
  /** Cor do tipo (a mesma do marcador fantasma). */
  readonly color = input<string | null>(null);

  readonly reopen = output<void>();
  readonly cancel = output<void>();
}
