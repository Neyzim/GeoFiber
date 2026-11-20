import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FiberEnd, SpliceRequest } from '../../core/api/api-types';
import { FiberInfo } from '../../core/network/box-interior';
import {
  FiberPick,
  SpliceSide,
  cableTubes,
  defaultSpliceCables,
  fiberPick,
  pickHint,
  usedEnd,
} from '../../core/network/splice-board';
import { FiberDotComponent } from '../../shared/common/fiber-dot';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';

interface FiberView {
  info: FiberInfo;
  pick: FiberPick;
  chosen: boolean;
}

interface TubeView {
  number: number;
  color: FiberInfo['tubeColor'];
  fibers: FiberView[];
}

/** Uma coluna do painel: o lado que chega ou o lado que sai. */
interface ColumnView {
  side: SpliceSide;
  title: string;
  cableId: string | null;
  cableName: string;
  end: FiberEnd;
  tubes: TubeView[];
}

const ENDS: readonly FiberEnd[] = ['A', 'B'];

/**
 * Escolha das duas fibras de uma emenda numa posição vazia: duas colunas (chega / sai), cada uma
 * com o seletor de cabo e os tubos com as fibras coloridas. Fibras em uso ficam apagadas e dizem
 * por quê. A ponta segue o papel do cabo; o modo avançado deixa trocar.
 */
@Component({
  selector: 'app-splice-picker',
  imports: [
    FiberDotComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './splice-picker.html',
  styleUrl: './splice-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplicePickerComponent {
  protected readonly store = inject(BoxSheetStore);

  readonly trayNumber = input.required<number>();
  readonly position = input.required<number>();

  /** A emenda foi registrada. */
  readonly done = output<void>();
  readonly closed = output<void>();
  /** Atalho para a ficha do cabo (cadastrar tubos e fibras). */
  readonly openCable = output<string>();

  protected readonly ends = ENDS;

  private readonly defaults = computed(() => defaultSpliceCables(this.store.cables()));
  protected readonly inCable = linkedSignal(() => this.defaults()[0]);
  protected readonly outCable = linkedSignal(() => this.defaults()[1]);
  protected readonly inFiber = signal<string | null>(null);
  protected readonly outFiber = signal<string | null>(null);
  protected readonly inEnd = signal<FiberEnd | null>(null);
  protected readonly outEnd = signal<FiberEnd | null>(null);
  protected readonly advanced = signal(false);
  protected readonly loss = signal('');
  /** Motivo de uma fibra apagada que acabou de ser tocada. */
  protected readonly notice = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly columns = computed<ColumnView[]>(() => [
    this.column('in', this.inCable(), this.inEnd(), this.inFiber(), this.outFiber()),
    this.column('out', this.outCable(), this.outEnd(), this.outFiber(), this.inFiber()),
  ]);

  protected readonly hint = computed(() => {
    const notice = this.notice();
    if (notice) return notice;
    const [input, output] = this.columns();
    return pickHint(this.info(this.inFiber()), this.info(this.outFiber()), input.cableName, output.cableName);
  });

  protected readonly ready = computed(() =>
    this.columns().every((column) =>
      column.tubes.some((tube) => tube.fibers.some((fiber) => fiber.chosen && fiber.pick.free)),
    ),
  );

  protected cableName(cableId: string | null): string {
    return this.store.cables().find((cable) => cable.cableId === cableId)?.name ?? 'cabo';
  }

  protected selectCable(side: SpliceSide, cableId: string): void {
    (side === 'in' ? this.inCable : this.outCable).set(cableId);
    (side === 'in' ? this.inFiber : this.outFiber).set(null);
    this.notice.set(null);
  }

  protected selectEnd(side: SpliceSide, end: FiberEnd): void {
    (side === 'in' ? this.inEnd : this.outEnd).set(end);
    (side === 'in' ? this.inFiber : this.outFiber).set(null);
    this.notice.set(null);
  }

  protected tapFiber(side: SpliceSide, fiber: FiberView): void {
    if (!fiber.pick.free) {
      this.notice.set(`Esta fibra está ${fiber.pick.reason}.`);
      return;
    }
    this.notice.set(null);
    this.error.set(null);
    (side === 'in' ? this.inFiber : this.outFiber).set(fiber.info.id);
  }

  protected setLoss(value: string): void {
    this.loss.set(value);
    this.error.set(null);
  }

  protected save(): void {
    const [input, output] = this.columns();
    const inFiber = this.inFiber();
    const outFiber = this.outFiber();
    if (!this.ready() || !inFiber || !outFiber) return;
    const loss = parseLoss(this.loss());
    if (loss === null) {
      this.error.set('Perda inválida. Use um número em dB, por exemplo 0,05.');
      return;
    }
    const body: SpliceRequest = {
      trayNumber: this.trayNumber(),
      positionNumber: this.position(),
      inputFiberId: inFiber,
      inputFiberEnd: input.end,
      outputFiberId: outFiber,
      outputFiberEnd: output.end,
      ...(loss !== undefined ? { attenuationDb: loss } : {}),
    };
    this.error.set(null);
    this.store.saveSplice(body, (error) => {
      if (error) this.error.set(error);
      else this.done.emit();
    });
  }

  private info(id: string | null): FiberInfo | undefined {
    return id ? this.store.fiberIndex().get(id) : undefined;
  }

  private column(
    side: SpliceSide,
    cableId: string | null,
    override: FiberEnd | null,
    chosen: string | null,
    chosenOther: string | null,
  ): ColumnView {
    const role = this.store.cables().find((cable) => cable.cableId === cableId)?.attachmentRole;
    const end = override ?? usedEnd(role, side);
    const context = {
      boxId: this.store.boxId() ?? '',
      splices: this.store.splices(),
      chosenOther: chosenOther ?? undefined,
    };
    const tubes = cableId
      ? cableTubes(this.store.fiberIndex(), cableId).map((tube) => ({
          number: tube.number,
          color: tube.color,
          fibers: tube.fibers.map((info) => ({
            info,
            pick: fiberPick(info, end, context),
            chosen: info.id === chosen,
          })),
        }))
      : [];
    return {
      side,
      title: side === 'in' ? 'Lado que chega' : 'Lado que sai',
      cableId,
      cableName: this.cableName(cableId),
      end,
      tubes,
    };
  }
}

/** "0,05" → 0.05; vazio → `undefined`; inválido ou negativo → `null`. */
function parseLoss(text: string): number | undefined | null {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}
