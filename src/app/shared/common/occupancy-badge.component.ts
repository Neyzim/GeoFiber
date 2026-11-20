import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Ocupação sempre visível: "3/12 posições". Some quando não há capacidade. */
@Component({
  selector: 'app-occupancy-badge',
  standalone: true,
  template: `@if (capacity() > 0) {<span class="occupancy gf-data"><strong>{{ occupied() }}</strong>/{{ capacity() }} {{ unit() }}</span>}`,
  styles: `
    .occupancy {
      font-size: 12px;
      color: var(--gf-text-2);
      white-space: nowrap;
    }
    strong {
      color: var(--gf-text);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccupancyBadgeComponent {
  readonly occupied = input<number>(0);
  readonly capacity = input<number>(0);
  readonly unit = input('posições');
}
