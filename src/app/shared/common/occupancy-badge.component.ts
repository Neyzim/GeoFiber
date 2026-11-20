import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-occupancy-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="occupancy">{{ occupied() }}/{{ capacity() }} posições</span>`,
  styles: [`
    .occupancy {
      font-size: 11px;
      font-weight: 500;
      color: #5d6b78;
      font-family: 'Courier New', monospace;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OccupancyBadgeComponent {
  occupied = input<number>(0);
  capacity = input<number>(0);
}
