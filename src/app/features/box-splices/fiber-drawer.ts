import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SpliceResponse } from '../../core/api/api-types';
import { DiagramEnd, DiagramMiddle, FiberIndex, diagramEnd } from '../../core/network/box-interior';
import { FiberRow, SplitterView } from '../../core/network/fiber-destinations';
import { TrayChoice, trayChoiceText } from '../../core/network/splice-plan';
import { DiagramLineComponent } from '../../shared/diagram/diagram-line.component';
import { SpliceDetailComponent } from './splice-detail';

export interface PendingSplice {
  from: FiberRow;
  to: FiberRow;
  choice: TrayChoice;
}

export type DrawerTrace = { kind: 'SPLICE' | 'FIBER' | 'SPLITTER'; id: string };

/**
 * Gaveta do diagrama de fusões: o desenho de uma ligação (ou de um splitter) e as ações. Com uma
 * emenda pendente, mostra a confirmação. No computador vira o painel da direita.
 */
@Component({
  selector: 'app-fiber-drawer',
  imports: [DiagramLineComponent, NgTemplateOutlet, MatButtonModule, MatIconModule, MatTooltipModule, SpliceDetailComponent],
  templateUrl: './fiber-drawer.html',
  styleUrl: './fiber-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiberDrawerComponent {
  readonly row = input<FiberRow | null>(null);
  readonly splitter = input<SplitterView | null>(null);
  readonly splice = input<SpliceResponse | null>(null);
  readonly pending = input<PendingSplice | null>(null);
  readonly error = input<string | null>(null);
  readonly canEdit = input(true);
  readonly saving = input(false);
  /** Para desenhar a outra fibra de um conector. */
  readonly fiberIndex = input<FiberIndex>(new Map());

  readonly startSplice = output<void>();
  readonly confirm = output<void>();
  readonly cancel = output<void>();
  readonly trace = output<DrawerTrace>();
  readonly undo = output<SpliceResponse>();
  readonly viewCable = output<string>();
  readonly closed = output<void>();

  protected readonly kind = computed(() => this.row()?.destination.kind ?? null);
  protected readonly here = computed<DiagramEnd | undefined>(() => diagramEnd(this.row()?.fiber));
  protected readonly other = computed<DiagramEnd | undefined>(() => {
    const id = this.row()?.destination.otherFiberId;
    return id ? diagramEnd(this.fiberIndex().get(id)) : undefined;
  });
  protected readonly connectorMiddle: DiagramMiddle = { type: 'connector' };
  protected readonly spliceMiddle: DiagramMiddle = { type: 'splice' };
  protected readonly pendingFrom = computed(() => diagramEnd(this.pending()?.from.fiber));
  protected readonly pendingTo = computed(() => diagramEnd(this.pending()?.to.fiber));
  protected readonly pendingText = computed(() => {
    const pending = this.pending();
    return pending ? trayChoiceText(pending.choice) : '';
  });
  protected readonly cannotConfirm = computed(() => this.saving() || this.pending()?.choice.kind === 'full');
  /** Texto do destino sem a seta: "porta 1 · Maria". */
  protected readonly destinationText = computed(() => (this.row()?.destination.text ?? '').replace(/^[→←]\s*/, ''));

  protected traceFiber(): void {
    const id = this.row()?.fiber.id;
    if (id) this.trace.emit({ kind: 'FIBER', id });
  }

  protected traceSplitter(id: string): void {
    this.trace.emit({ kind: 'SPLITTER', id });
  }
}
