import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { OpticalColor } from '../../core/api/api-types';
import { CableView, FiberRow, SplitterView } from '../../core/network/fiber-destinations';
import { opticalColor } from '../../core/network/optical-catalog';
import { FiberDotComponent } from '../../shared/common/fiber-dot';

/**
 * Diagrama de fusões em lista: uma aba por cabo (e "Splitters"), tubos que recolhem e uma linha por
 * fibra com a cor e o destino. No modo escolher, as fibras bloqueadas mostram o motivo.
 */
@Component({
  selector: 'app-fiber-list',
  imports: [FiberDotComponent],
  templateUrl: './fiber-list.html',
  styleUrl: './fiber-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiberListComponent {
  readonly cables = input<readonly CableView[]>([]);
  readonly splitters = input<readonly SplitterView[]>([]);
  readonly selectedFiberId = input<string | null>(null);
  /** Fibra → motivo de não poder ser escolhida (só no modo escolher). */
  readonly blocked = input<ReadonlyMap<string, string>>(new Map());
  /** Aba aberta: id do cabo ou "splitters"; vazio = o primeiro cabo. */
  readonly tab = model<string>('');

  readonly fiberTap = output<FiberRow>();
  readonly splitterTap = output<string>();
  readonly openCable = output<string>();

  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  protected readonly activeTab = computed(() => {
    const tab = this.tab();
    const cables = this.cables();
    if (tab === 'splitters' && this.splitters().length > 0) return tab;
    if (cables.some((cable) => cable.cableId === tab)) return tab;
    return cables[0]?.cableId ?? (this.splitters().length > 0 ? 'splitters' : '');
  });
  protected readonly activeCable = computed(
    () => this.cables().find((cable) => cable.cableId === this.activeTab()) ?? null,
  );

  protected select(tab: string): void {
    this.tab.set(tab);
  }

  protected tubeKey(cable: CableView, tube: number): string {
    return `${cable.cableId}:${tube}`;
  }

  protected isOpen(cable: CableView, tube: number): boolean {
    return !this.collapsed().has(this.tubeKey(cable, tube));
  }

  protected toggleTube(cable: CableView, tube: number): void {
    const key = this.tubeKey(cable, tube);
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected colorName(color: OpticalColor | undefined): string {
    return color ? opticalColor(color).label : '';
  }

  protected usedOutputs(splitter: SplitterView): number {
    return splitter.outputs.filter((output) => output.used).length;
  }

  protected isUsed(row: FiberRow): boolean {
    return !['free', 'pass-through', 'broken', 'reserved'].includes(row.destination.kind);
  }
}
