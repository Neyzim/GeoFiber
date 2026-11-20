import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TermHintComponent } from '../../../shared/help/term-hint';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CableFiberResponse, FiberEndResponse, FiberStatus } from '../../../core/api/api-types';
import { RouteItem } from '../../../core/network/cable-route';
import { MapCable } from '../../../core/network/map-element';
import { roleDefinition, statusDefinition } from '../../../core/network/network-catalog';
import {
  FIBERS_PER_TUBE_OPTIONS,
  FIBER_STATUSES,
  defaultFibersPerTube,
  fiberLinkText,
  fiberStatusDefinition,
  opticalColor,
  structurePreview,
} from '../../../core/network/optical-catalog';
import { CableSheetStore } from './cable-sheet-store';

const ROUTE_LABELS = { first: 'Início', middle: 'Passa por', last: 'Fim' } as const;

/**
 * Ficha do cabo selecionado: frase simples de onde ele vem e aonde vai, a lista de
 * elementos (editável) e os tubos e fibras.
 */
@Component({
  selector: 'app-cable-sheet',
  imports: [
    TermHintComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './cable-sheet.html',
  styleUrl: './cable-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableSheetComponent {
  protected readonly store = inject(CableSheetStore);

  readonly cable = input.required<MapCable>();
  /** OLTs e caixas que podem entrar na lista do cabo. */
  readonly candidates = input<readonly RouteItem[]>([]);
  /** Nome de cada OLT/caixa pelo id (para descrever as ligações das fibras). */
  readonly elementNames = input<ReadonlyMap<string, string>>(new Map());
  readonly canEdit = input(true);

  readonly closed = output<void>();
  readonly editData = output<void>();
  readonly focusItem = output<RouteItem>();

  protected readonly perTubeOptions = FIBERS_PER_TUBE_OPTIONS;
  protected readonly statusOptions = FIBER_STATUSES.filter((item) => item.status !== 'OCCUPIED');
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  private readonly chosenPerTube = signal<number | null>(null);

  protected readonly role = computed(() => roleDefinition(this.cable().role));
  protected readonly status = computed(() => statusDefinition(this.cable().status));
  protected readonly perTube = computed(
    () => this.chosenPerTube() ?? defaultFibersPerTube(this.cable().fiberCapacity),
  );
  protected readonly preview = computed(() =>
    structurePreview(this.cable().fiberCapacity, this.perTube()),
  );
  protected readonly lengthText = computed(() => {
    const meters = this.cable().lengthMeters;
    return meters === null ? null : `${Math.round(meters).toLocaleString('pt-BR')} m`;
  });

  /** Opções do seletor "Adicionar elemento", sem os que já estão no rascunho. */
  protected readonly addOptions = computed(() => {
    const used = new Set(this.store.draft().map((item) => `${item.ref.kind}:${item.ref.id}`));
    return this.candidates().filter((item) => !used.has(`${item.ref.kind}:${item.ref.id}`));
  });

  protected routeLabel(index: number, total: number): string {
    if (index === 0) return ROUTE_LABELS.first;
    if (index === total - 1) return ROUTE_LABELS.last;
    return ROUTE_LABELS.middle;
  }

  protected colorOf(color: Parameters<typeof opticalColor>[0]) {
    return opticalColor(color);
  }

  protected fiberStatus(status: FiberStatus | undefined) {
    return fiberStatusDefinition(status);
  }

  protected endText(end: FiberEndResponse): string {
    const names = this.elementNames();
    return fiberLinkText(end, (id) => names.get(id));
  }

  protected toggleTube(id: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected setPerTube(value: number): void {
    this.chosenPerTube.set(value);
  }

  protected addCandidate(key: string): void {
    const item = this.candidates().find((option) => `${option.ref.kind}:${option.ref.id}` === key);
    if (item) this.store.addToDraft(item);
  }

  protected createStructure(): void {
    this.store.createStructure(this.cable().fiberCapacity, this.perTube());
  }

  protected setStatus(fiber: CableFiberResponse, status: FiberStatus): void {
    this.store.setFiberStatus(fiber, status);
  }

  protected keyOf(item: RouteItem): string {
    return `${item.ref.kind}:${item.ref.id}`;
  }
}
