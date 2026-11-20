import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OpticalColor } from '../../core/api/api-types';
import { OPTICAL_COLORS } from '../../core/network/optical-catalog';

/** Bolinha com a cor ABNT de uma fibra ou tubo e o número por cima. */
@Component({
  selector: 'app-fiber-dot',
  standalone: true,
  template: `<span
    class="fiber-dot"
    [class.fiber-dot--sm]="size() === 'sm'"
    [class.fiber-dot--unknown]="!definition()"
    [class.fiber-dot--ink-dark]="definition()?.ink === 'dark'"
    [class.fiber-dot--ink-light]="definition()?.ink === 'light'"
    [style.background]="definition()?.hex ?? null"
    [attr.aria-label]="label()"
    [attr.title]="label()"
    role="img"
  >{{ size() === 'md' ? (number() ?? '') : '' }}</span>`,
  styles: `
    .fiber-dot {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 24px;
      height: 24px;
      box-sizing: border-box;
      border-radius: 50%;
      border: 1px solid var(--gf-fiber-edge);
      font: 600 11px/1 var(--gf-font-data);
    }
    .fiber-dot--sm {
      width: 14px;
      height: 14px;
    }
    .fiber-dot--ink-dark {
      color: var(--gf-ink-dark);
    }
    .fiber-dot--ink-light {
      color: var(--gf-ink-light);
    }
    .fiber-dot--unknown {
      background: transparent;
      border-style: dashed;
      border-color: var(--gf-text-2);
      color: var(--gf-text-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiberDotComponent {
  readonly color = input<OpticalColor | undefined>();
  readonly number = input<number | null>(null);
  readonly kind = input<'fibra' | 'tubo'>('fibra');
  readonly size = input<'md' | 'sm'>('md');

  /** Não usa opticalColor(): aquela devolve Verde quando a cor falta. */
  protected readonly definition = computed(() =>
    OPTICAL_COLORS.find((item) => item.color === this.color()),
  );

  protected readonly label = computed(() => {
    const kind = this.kind() === 'tubo' ? 'Tubo' : 'Fibra';
    const number = this.number();
    const numberText = number !== null && number !== undefined ? ` ${number}` : '';
    const colorName = this.definition()?.label ?? 'cor desconhecida';
    return `${kind}${numberText} · ${colorName}`;
  });
}
