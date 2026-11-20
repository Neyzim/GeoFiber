import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TermHintComponent } from '../../../shared/help/term-hint';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';
import { AttachedCableResponse, OltPortResponse, PortStatus } from '../../../core/api/api-types';
import { fiberLabel, nextNumber } from '../../../core/network/box-interior';
import { MapElement } from '../../../core/network/map-element';
import {
  groupDefinition,
  roleDefinition,
  statusDefinition,
} from '../../../core/network/network-catalog';
import { PORT_STATUSES, portStatusDefinition } from '../../../core/network/optical-catalog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import {
  FiberLinkData,
  FiberLinkDialogComponent,
  FiberLinkResult,
} from '../box-sheet/fiber-link-dialog';
import { OltSheetStore } from './olt-sheet-store';

/** Ficha da OLT selecionada: portas PON por placa e os cabos que saem dela. */
@Component({
  selector: 'app-olt-sheet',
  imports: [
    TermHintComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './olt-sheet.html',
  styleUrls: ['../cable-sheet/cable-sheet.scss', '../box-sheet/box-sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OltSheetComponent {
  protected readonly store = inject(OltSheetStore);
  private readonly dialog = inject(MatDialog);

  readonly olt = input.required<MapElement>();
  readonly canEdit = input(true);

  readonly closed = output<void>();
  readonly editData = output<void>();
  readonly openCable = output<string>();

  protected readonly countOptions = [1, 4, 8, 16];
  protected readonly newCount = signal(16);
  private readonly chosenSlot = signal<number | null>(null);
  protected readonly manualStatuses = PORT_STATUSES.filter((item) => item.status !== 'OCCUPIED');

  protected readonly group = computed(() => groupDefinition(this.olt().group));
  protected readonly status = computed(() => statusDefinition(this.olt().status));
  /** Placa sugerida: a última existente (ou 1). */
  protected readonly newSlot = computed(
    () =>
      this.chosenSlot() ??
      Math.max(1, nextNumber(this.store.slots().map((group) => group.slot)) - 1),
  );

  protected setSlot(value: string): void {
    const slot = Number(value);
    this.chosenSlot.set(Number.isInteger(slot) && slot > 0 ? slot : null);
  }

  protected roleLabel(cable: AttachedCableResponse): string {
    return cable.role ? roleDefinition(cable.role).label : '';
  }

  protected portTarget(port: OltPortResponse): string {
    if (!port.fiberId) return 'Nada ligado';
    return `Envia sinal por ${fiberLabel(this.store.fiberIndex().get(port.fiberId))}`;
  }

  protected portStatus(port: OltPortResponse) {
    return portStatusDefinition(port.status);
  }

  protected addPorts(): void {
    this.store.addPorts(this.newSlot(), this.newCount());
  }

  protected linkFiber(port: OltPortResponse): void {
    this.dialog
      .open<FiberLinkDialogComponent, FiberLinkData, FiberLinkResult>(FiberLinkDialogComponent, {
        data: {
          title: `Placa ${port.slotNumber} · PON ${port.portNumber}`,
          intro: 'Escolha a fibra do cabo que leva o sinal desta porta para a rede.',
          slots: [{ label: 'Fibra', defaultEnd: 'A', current: port.fiberId }],
          fibers: this.store.fiberIndex(),
          confirmLabel: 'Ligar',
        },
        width: '560px',
        maxWidth: '94vw',
      })
      .afterClosed()
      .pipe(filter((result): result is FiberLinkResult => !!result))
      .subscribe(({ choices: [choice] }) => this.store.linkPort(port, choice));
  }

  protected unlinkFiber(port: OltPortResponse): void {
    this.store.linkPort(port, null);
  }

  protected setStatus(port: OltPortResponse, status: PortStatus): void {
    if (status !== 'OCCUPIED') this.store.setPortStatus(port, status);
  }

  protected deletePort(port: OltPortResponse): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Excluir porta PON',
          message: `Excluir a porta PON ${port.portNumber} da placa ${port.slotNumber}?`,
          confirmLabel: 'Excluir',
          danger: true,
        },
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) this.store.deletePort(port);
      });
  }
}
