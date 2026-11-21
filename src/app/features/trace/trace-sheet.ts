import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TraceBranch, TraceBreak, TraceDirection, TraceStep } from '../../core/api/trace-types';
import {
  branchLine,
  breakMessage,
  fiberText,
  headline,
  splitterSummary,
  stepKindLabel,
} from '../../core/network/trace-view';
import { TraceStore } from './trace-store';

const DIRECTIONS: readonly { value: TraceDirection; label: string }[] = [
  { value: 'UPSTREAM', label: 'Até a OLT' },
  { value: 'DOWNSTREAM', label: 'Até os clientes' },
];

/**
 * Ficha do rastreio: mostra o caminho do sinal em ordem, as quebras e, no splitter descendo, as
 * saídas. Usa o `TraceStore` provido pela página do mapa. Só leitura.
 */
@Component({
  selector: 'app-trace-sheet',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './trace-sheet.html',
  styleUrls: ['../network-map/sheet-frame.scss', './trace-sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraceSheetComponent {
  readonly store = inject(TraceStore);
  readonly closed = output<void>();
  /** A página diz se há item de origem para o botão Voltar devolver a tela a ele. */
  readonly hasOrigin = input(false);
  /** Voltar sem saída aberta: a página fecha o rastreio e reabre o item de origem. */
  readonly leave = output<void>();

  protected goBack(): void {
    if (this.store.canGoBack()) {
      this.store.back();
    } else {
      this.leave.emit();
    }
  }

  protected readonly directions = DIRECTIONS;
  protected readonly title = 'Por onde passa o sinal';
  protected readonly headline = computed(() => {
    const response = this.store.response();
    return response ? headline(response) : '';
  });
  protected readonly steps = computed(() => this.store.response()?.steps ?? []);
  protected readonly breaks = computed(() => this.store.response()?.breaks ?? []);
  protected readonly customers = computed(() => this.store.response()?.customers ?? []);
  protected readonly branches = computed(() => this.store.response()?.branches ?? []);
  protected readonly showBranches = computed(
    () => this.store.kind() === 'SPLITTER' && this.store.direction() === 'DOWNSTREAM',
  );
  protected readonly summary = computed(() => splitterSummary(this.branches()));

  protected stepKind(step: TraceStep): string {
    return stepKindLabel(step.kind ?? '');
  }

  protected stepDetail(step: TraceStep): string {
    if (step.position) {
      return `Bandeja ${step.position.tray} · posição ${step.position.number}`;
    }
    return fiberText(step.fiber) ?? '';
  }

  protected breakText(item: TraceBreak): string {
    return item.reason ? breakMessage(item.reason) : 'O caminho para aqui.';
  }

  protected branchText(branch: TraceBranch): string {
    return branchLine(branch);
  }

  /** Só saídas com algo ligado podem ser abertas; livre não tem clientes para mostrar. */
  protected canOpenBranch(branch: TraceBranch): boolean {
    return branch.status !== 'FREE' && !!branch.traceRef;
  }

  protected setDirection(direction: TraceDirection): void {
    this.store.setDirection(direction);
  }

  protected openBranch(branch: TraceBranch): void {
    if (branch.traceRef) {
      this.store.openBranch(branch.traceRef);
    }
  }
}
