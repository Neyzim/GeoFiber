import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Pin,
  pinColor,
  pinStatusDefinition,
  pinTypeDefinition,
} from '../../core/models/pin.model';

/** Lista de PINs do projeto com ações rápidas de navegação e edição. */
@Component({
  selector: 'app-pin-list',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './pin-list.html',
  styleUrl: './pin-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinListComponent {
  readonly pins = input<readonly Pin[]>([]);
  readonly selectedId = input<string | null>(null);

  readonly select = output<Pin>();
  readonly zoomTo = output<Pin>();
  readonly edit = output<Pin>();
  readonly remove = output<Pin>();

  protected code(pin: Pin): string {
    return pinTypeDefinition(pin.type).code;
  }

  protected typeLabel(pin: Pin): string {
    return pinTypeDefinition(pin.type).label;
  }

  protected statusLabel(pin: Pin): string {
    return pinStatusDefinition(pin.status).label;
  }

  protected color(pin: Pin): string {
    return pinColor(pin);
  }

  protected statusColor(pin: Pin): string {
    return pinStatusDefinition(pin.status).color;
  }
}
