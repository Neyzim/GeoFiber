import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SpliceResponse, TrayResponse } from '../../core/api/api-types';
import { FiberInfo, formatAttenuation } from '../../core/network/box-interior';
import { OPTICAL_COLORS } from '../../core/network/optical-catalog';
import { fiberShortName, trayPositions, unplacedSplices } from '../../core/network/splice-board';
import { FiberDotComponent } from '../../shared/common/fiber-dot';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';

/** Um lado da emenda pronto para desenhar. */
interface SideView {
  info: FiberInfo | undefined;
  name: string;
  hex: string;
}

interface PositionView {
  number: number;
  splice: SpliceResponse | null;
  input?: SideView;
  output?: SideView;
  loss?: string;
}

/**
 * Uma bandeja como a física: todas as posições de 1 até a capacidade, cada uma vazia ou com a
 * emenda (fibra que chega · protetor · fibra que sai). Fusões antigas sem posição válida ficam
 * numa faixa abaixo.
 */
@Component({
  selector: 'app-tray-board',
  imports: [FiberDotComponent, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './tray-board.html',
  styleUrl: './tray-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrayBoardComponent {
  private readonly store = inject(BoxSheetStore);

  readonly tray = input.required<TrayResponse>();
  readonly canEdit = input(true);
  /** Posição destacada (a que está aberta no painel). */
  readonly selected = input<number | null>(null);

  readonly positionTapped = output<number>();
  readonly spliceTapped = output<SpliceResponse>();
  readonly deleteRequested = output<SpliceResponse>();

  protected readonly positions = computed<PositionView[]>(() =>
    trayPositions(this.tray().capacity ?? 0, this.tray().trayNumber ?? 0, this.store.splices()).map(
      (position) =>
        position.splice
          ? {
              ...position,
              input: this.side(position.splice.inputFiberId),
              output: this.side(position.splice.outputFiberId),
              loss: formatAttenuation(position.splice.attenuationDb),
            }
          : position,
    ),
  );

  protected readonly unplaced = computed(() =>
    unplacedSplices(this.store.trays(), this.tray().trayNumber ?? 0, this.store.splices()).map(
      (splice) => ({
        splice,
        input: this.side(splice.inputFiberId),
        output: this.side(splice.outputFiberId),
      }),
    ),
  );

  private side(fiberId: string | undefined): SideView {
    const info = fiberId ? this.store.fiberIndex().get(fiberId) : undefined;
    const hex = OPTICAL_COLORS.find((item) => item.color === info?.color)?.hex ?? 'transparent';
    return { info, name: fiberShortName(info), hex };
  }

  protected tap(position: PositionView): void {
    if (position.splice) this.spliceTapped.emit(position.splice);
    else if (this.canEdit()) this.positionTapped.emit(position.number);
  }
}
