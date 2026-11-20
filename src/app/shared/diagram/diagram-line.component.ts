import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lineStyleByState } from '../../core/network/line-state-style';

export interface FiberInfo {
  name: string;
  number: number;
  color: string;
}

@Component({
  selector: 'app-diagram-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagram-line.component.html',
  styleUrls: ['./diagram-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagramLineComponent {
  entrance = input<{ cable: string; tube: string; fiber: FiberInfo }>();
  box = input<{ name: string; type: string }>();
  exit = input<{ cable: string; tube: string; fiber: FiberInfo }>();
  state = input<'active' | 'planned' | 'disabled' | 'broken' | 'reserved'>('active');

  protected lineStyle = computed(() => lineStyleByState(this.state()));
}
