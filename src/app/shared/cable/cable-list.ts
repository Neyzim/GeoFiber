import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Cable, cableColor, cableTypeDefinition } from '../../core/models/cable.model';
import { pinStatusDefinition } from '../../core/models/pin.model';

/** Lista de cabos do projeto com ações rápidas de navegação e remoção. */
@Component({
  selector: 'app-cable-list',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './cable-list.html',
  styleUrl: './cable-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableListComponent {
  readonly cables = input<readonly Cable[]>([]);
  readonly selectedId = input<string | null>(null);

  readonly select = output<Cable>();
  readonly edit = output<Cable>();
  readonly remove = output<Cable>();

  protected code(cable: Cable): string {
    return cableTypeDefinition(cable.type).code;
  }

  protected nodeCount(cable: Cable): number {
    return cable.points.length;
  }

  protected typeLabel(cable: Cable): string {
    return cableTypeDefinition(cable.type).label;
  }

  protected statusLabel(cable: Cable): string {
    return pinStatusDefinition(cable.status).label;
  }

  protected color(cable: Cable): string {
    return cableColor(cable);
  }

  protected statusColor(cable: Cable): string {
    return pinStatusDefinition(cable.status).color;
  }

  protected dashed(cable: Cable): boolean {
    return Boolean(cableTypeDefinition(cable.type).dashArray);
  }
}
