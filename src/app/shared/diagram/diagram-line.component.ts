import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FiberDotComponent } from '../common/fiber-dot';
import {
  DiagramEnd,
  DiagramMiddle,
  describeDiagramEnd,
  describeDiagramMiddle,
} from '../../core/network/box-interior';

/** Uma emenda em uma linha: Entrada (cabo, tubo, fibra) — meio (posição e perda, ou conector) — Saída. */
@Component({
  selector: 'app-diagram-line',
  standalone: true,
  imports: [FiberDotComponent],
  template: `<div class="diagram-line" role="group" [attr.aria-label]="label()">
    @for (end of ends(); track $index) {
      @if ($index === 1) {
        <div class="diagram-line__middle" aria-hidden="true">{{ middleText() }}</div>
      }
      <div class="diagram-line__end" aria-hidden="true">
        @if (end) {
          <small>{{ end.cable }}</small>
          <span class="diagram-line__dots">
            @if (end.tubeColor || end.tubeNumber !== undefined) {
              <app-fiber-dot
                [color]="end.tubeColor"
                [number]="end.tubeNumber ?? null"
                kind="tubo"
                size="sm"
              />
            }
            @if (end.fiberColor || end.fiberNumber !== undefined) {
              <app-fiber-dot [color]="end.fiberColor" [number]="end.fiberNumber ?? null" />
            }
          </span>
        } @else {
          <small>Nada ligado</small>
        }
      </div>
    }
  </div>`,
  styles: `
    .diagram-line {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 8px;
      align-items: center;
      padding: 8px;
      border-radius: var(--gf-radius-control);
      background: var(--gf-surface-2);
      font-size: 12px;
    }

    .diagram-line__end {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
      text-align: center;
      min-width: 0;
    }

    .diagram-line__end small {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--gf-text-2);
    }

    .diagram-line__dots {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .diagram-line__middle {
      padding: 0 4px;
      color: var(--gf-text-2);
      font: 11px/1.2 var(--gf-font-data);
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramLineComponent {
  readonly entrada = input<DiagramEnd | undefined>();
  readonly middle = input<DiagramMiddle | undefined>();
  readonly saida = input<DiagramEnd | undefined>();

  protected readonly ends = computed(() => [this.entrada(), this.saida()]);
  protected readonly middleText = computed(() => describeDiagramMiddle(this.middle()));

  protected readonly label = computed(() =>
    [
      describeDiagramEnd(this.entrada(), 'entrada'),
      this.middleText(),
      describeDiagramEnd(this.saida(), 'saída'),
    ]
      .filter(Boolean)
      .join('. '),
  );
}
