import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachedCableResponse } from '../../core/api/api-types';
import { FiberInfo } from '../../core/network/box-interior';
import { OPTICAL_COLORS, opticalColor } from '../../core/network/optical-catalog';
import {
  CableTube,
  attachmentText,
  cableTubes,
  fiberLocation,
  usedEnd,
} from '../../core/network/splice-board';
import { FiberDotComponent } from '../../shared/common/fiber-dot';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';

interface CableBar {
  cable: AttachedCableResponse;
  id: string;
  role: string;
  stripes: string[];
  tubes: CableTube[];
}

/**
 * Faixa com os cabos da caixa: uma barra por cabo com as listras de cor dos tubos. Tocar na barra
 * abre o cabo e mostra, fibra por fibra, onde ela está emendada nesta caixa.
 */
@Component({
  selector: 'app-cable-strip',
  imports: [FiberDotComponent, MatButtonModule, MatIconModule],
  templateUrl: './cable-strip.html',
  styleUrl: './cable-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableStripComponent {
  private readonly store = inject(BoxSheetStore);

  /** Atalho para a ficha do cabo (no mapa). */
  readonly openCable = output<string>();

  protected readonly openId = signal<string | null>(null);

  protected readonly bars = computed<CableBar[]>(() =>
    this.store.cables().map((cable) => {
      const tubes = cableTubes(this.store.fiberIndex(), cable.cableId ?? '');
      return {
        cable,
        id: cable.cableId ?? '',
        role: attachmentText(cable.attachmentRole),
        stripes: tubes.map(
          (tube) => OPTICAL_COLORS.find((item) => item.color === tube.color)?.hex ?? 'transparent',
        ),
        tubes,
      };
    }),
  );

  protected readonly open = computed(() => this.bars().find((bar) => bar.id === this.openId()) ?? null);

  protected toggle(id: string): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  protected colorName(info: FiberInfo): string {
    return info.color ? opticalColor(info.color).label : 'sem cor';
  }

  /**
   * Onde a fibra está nesta caixa, pela ponta usada aqui. Cabo que passa por aqui usa as duas
   * pontas: mostra a que chega (B) e, se estiver livre, a que sai (A).
   */
  protected location(bar: CableBar, info: FiberInfo): string {
    const context = { boxId: this.store.boxId() ?? '', splices: this.store.splices() };
    const role = bar.cable.attachmentRole;
    const first = fiberLocation(info, usedEnd(role, 'in'), context);
    if (role !== 'PASS_THROUGH' && role !== undefined) return first;
    return first === 'livre nesta caixa' ? fiberLocation(info, usedEnd(role, 'out'), context) : first;
  }
}
