import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitVisible, UnifilarEnd, UnifilarSides } from '../../core/network/unifilar';
import { LineState, lineStyleByState } from '../../core/network/line-state-style';

function describeSide(items: readonly UnifilarEnd[], empty: string): string {
  if (items.length === 0) return empty;
  return items.map((item) => item.label + (item.detail ? ` · ${item.detail}` : '')).join(', ');
}

/** Topo da ficha: "Chega" → elemento → "Sai", com no máximo 3 itens por lado e "+N". */
@Component({
  selector: 'app-unifilar-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="unifilar" role="group" [attr.aria-label]="description()">
    <div class="unifilar__side unifilar__side--in" aria-hidden="true">
      <span class="unifilar__caption">Chega</span>
      @for (end of incoming().shown; track $index) {
        <span class="unifilar__end"
          >{{ end.label }}@if (end.detail) {<small class="gf-data"> · {{ end.detail }}</small>}</span
        >
      } @empty {
        <span class="unifilar__empty">{{ emptyIncoming() }}</span>
      }
      @if (incoming().hidden > 0) {
        <span class="unifilar__more gf-data">+{{ incoming().hidden }}</span>
      }
    </div>

    <svg class="unifilar__line" viewBox="0 0 32 8" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" stroke-width="1"
        [attr.stroke-dasharray]="dashArray()" [attr.stroke-linecap]="lineCap()" />
    </svg>

    <span class="unifilar__element" aria-hidden="true" [style.background]="color()">{{ code() }}</span>

    <svg class="unifilar__line" viewBox="0 0 32 8" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" stroke-width="1"
        [attr.stroke-dasharray]="dashArray()" [attr.stroke-linecap]="lineCap()" />
    </svg>

    <div class="unifilar__side unifilar__side--out" aria-hidden="true">
      <span class="unifilar__caption">Sai</span>
      @for (end of outgoing().shown; track $index) {
        <span class="unifilar__end"
          >{{ end.label }}@if (end.detail) {<small class="gf-data"> · {{ end.detail }}</small>}</span
        >
      } @empty {
        <span class="unifilar__empty">{{ emptyOutgoing() }}</span>
      }
      @if (outgoing().hidden > 0) {
        <span class="unifilar__more gf-data">+{{ outgoing().hidden }}</span>
      }
    </div>
  </div>`,
  styles: `
    .unifilar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 24px auto 24px minmax(0, 1fr);
      align-items: center;
      gap: 4px;
      padding: 8px 0;
    }
    .unifilar__side {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      font: 400 12px/1.4 var(--gf-font-ui);
    }
    .unifilar__side--in {
      align-items: flex-end;
      text-align: right;
    }
    .unifilar__side--out {
      align-items: flex-start;
    }
    .unifilar__caption {
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gf-text-2);
    }
    .unifilar__end {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .unifilar__empty,
    .unifilar__more {
      color: var(--gf-text-2);
    }
    .unifilar__line {
      width: 100%;
      height: 8px;
      color: var(--gf-text-2);
    }
    .unifilar__element {
      display: inline-grid;
      place-items: center;
      min-width: 44px;
      height: 28px;
      padding: 0 8px;
      box-sizing: border-box;
      border-radius: var(--gf-radius-control);
      color: #fff;
      font: 700 11px/1 var(--gf-font-ui);
    }
  `,
})
export class UnifilarSummaryComponent {
  readonly code = input.required<string>();
  readonly color = input.required<string>();
  readonly sides = input.required<UnifilarSides>();
  readonly state = input<LineState>('active');
  readonly emptyIncoming = input('Nada chega aqui');
  readonly emptyOutgoing = input('Nada sai daqui');

  protected readonly incoming = computed(() => splitVisible(this.sides().incoming));
  protected readonly outgoing = computed(() => splitVisible(this.sides().outgoing));

  /** Leitor de tela recebe a lista inteira, inclusive o que ficou no "+N". */
  protected readonly description = computed(
    () =>
      `${this.code()}. Chega: ${describeSide(this.sides().incoming, this.emptyIncoming())}. ` +
      `Sai: ${describeSide(this.sides().outgoing, this.emptyOutgoing())}.`,
  );

  private readonly lineStyle = computed(() => lineStyleByState(this.state()));
  /** Linha cheia não leva o atributo (null remove). */
  protected readonly dashArray = computed(() => this.lineStyle().dasharray || null);
  protected readonly lineCap = computed(() => this.lineStyle().linecap);
}
