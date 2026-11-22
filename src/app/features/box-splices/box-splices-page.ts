import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { SpliceResponse, TrayResponse } from '../../core/api/api-types';
import { CableView, FiberRow, boxFiberMap, boxSplitters } from '../../core/network/fiber-destinations';
import { NetworkMapState } from '../../core/network/network-map-state';
import { groupDefinition, statusDefinition } from '../../core/network/network-catalog';
import { opticalColor } from '../../core/network/optical-catalog';
import { defaultSpliceCables, fiberPick } from '../../core/network/splice-board';
import { spliceSides, trayForNewSplice } from '../../core/network/splice-plan';
import { MapReturnService } from '../../core/services/map-return';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { DrawerTrace, FiberDrawerComponent, PendingSplice } from './fiber-drawer';
import { FiberListComponent } from './fiber-list';

/** O que a gaveta mostra: uma fibra, um splitter ou uma emenda (pelo id, lido nos dados atuais). */
type Selection = { kind: 'fiber' | 'splitter' | 'splice'; id: string } | null;

/**
 * Diagrama de fusões da caixa (`/caixas/:boxId/fusoes`): uma aba por cabo com o destino de cada
 * fibra, a gaveta com o desenho da ligação e a emenda por dois toques (a bandeja é escolhida ou
 * criada sozinha). Tem endereço próprio para mandar o link a outro técnico.
 */
@Component({
  selector: 'app-box-splices-page',
  imports: [
    FiberDrawerComponent,
    FiberListComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './box-splices-page.html',
  styleUrl: './box-splices-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BoxSheetStore],
})
export class BoxSplicesPage {
  protected readonly store = inject(BoxSheetStore);
  private readonly mapState = inject(NetworkMapState);
  private readonly mapReturn = inject(MapReturnService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly canEdit = this.mapState.canEdit;

  private readonly boxId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('boxId') ?? '')),
    { initialValue: '' },
  );

  protected readonly box = computed(() => this.store.overview()?.box ?? null);
  protected readonly group = computed(() => {
    const type = this.box()?.type;
    return type ? groupDefinition(type) : null;
  });
  protected readonly status = computed(() => {
    const status = this.box()?.usageStatus;
    return status ? statusDefinition(status) : null;
  });

  protected readonly cables = computed<CableView[]>(() => {
    const overview = this.store.overview();
    return overview ? boxFiberMap(overview, this.store.fiberIndex()) : [];
  });
  protected readonly splitters = computed(() => {
    const overview = this.store.overview();
    return overview ? boxSplitters(overview, this.store.fiberIndex()) : [];
  });
  private readonly rows = computed(() => {
    const byId = new Map<string, { row: FiberRow; cable: CableView }>();
    for (const cable of this.cables()) {
      for (const tube of cable.tubes) {
        for (const row of tube.rows) byId.set(row.fiber.id, { row, cable });
      }
    }
    return byId;
  });

  protected readonly tab = signal('');
  protected readonly selection = signal<Selection>(null);
  /** Modo escolher: a fibra de origem da emenda nova. */
  protected readonly choosing = signal<{ fromFiberId: string } | null>(null);
  protected readonly target = signal<string | null>(null);
  protected readonly drawerError = signal<string | null>(null);

  protected readonly selectedRow = computed<FiberRow | null>(() => {
    const selection = this.selection();
    if (selection?.kind === 'fiber') return this.rows().get(selection.id)?.row ?? null;
    if (selection?.kind === 'splice') {
      for (const { row } of this.rows().values()) {
        if (row.destination.spliceId === selection.id) return row;
      }
    }
    return null;
  });
  protected readonly selectedSplice = computed<SpliceResponse | null>(() => {
    const spliceId =
      this.selection()?.kind === 'splice' ? this.selection()!.id : this.selectedRow()?.destination.spliceId;
    return spliceId ? (this.store.splices().find((splice) => splice.id === spliceId) ?? null) : null;
  });
  protected readonly selectedSplitter = computed(() => {
    const selection = this.selection();
    const id = selection?.kind === 'splitter' ? selection.id : this.selectedRow()?.destination.splitterId;
    return id ? (this.splitters().find((splitter) => splitter.id === id) ?? null) : null;
  });
  protected readonly pending = computed<PendingSplice | null>(() => {
    const choosing = this.choosing();
    const target = this.target();
    if (!choosing || !target) return null;
    const from = this.rows().get(choosing.fromFiberId)?.row;
    const to = this.rows().get(target)?.row;
    if (!from || !to) return null;
    return {
      from,
      to,
      choice: trayForNewSplice(this.store.trays(), this.store.splices(), this.box()?.trayCapacity),
    };
  });
  protected readonly choosingFrom = computed(() => {
    const id = this.choosing()?.fromFiberId;
    const row = id ? this.rows().get(id)?.row : undefined;
    return row ? this.fiberName(row) : null;
  });
  /** No modo escolher: fibras que não podem receber a emenda, com o motivo. */
  protected readonly blocked = computed<ReadonlyMap<string, string>>(() => {
    const choosing = this.choosing();
    if (!choosing) return new Map();
    const context = { boxId: this.boxId(), splices: this.store.splices(), chosenOther: choosing.fromFiberId };
    const blocked = new Map<string, string>();
    for (const { row } of this.rows().values()) {
      const pick = fiberPick(row.fiber, row.end, context);
      if (!pick.free) blocked.set(row.fiber.id, pick.reason ?? 'em uso');
    }
    return blocked;
  });
  protected readonly drawerOpen = computed(
    () => !!this.pending() || !!this.selectedRow() || !!this.selectedSplitter() || !!this.selectedSplice(),
  );
  protected readonly trayRows = computed(() =>
    this.store.trays().map((tray) => ({ tray, used: this.usedOf(tray) })),
  );

  constructor() {
    effect(() => {
      const id = this.boxId();
      untracked(() => {
        if (id) this.store.open(id);
      });
    });
  }

  protected onFiberTap(row: FiberRow): void {
    this.drawerError.set(null);
    const choosing = this.choosing();
    if (choosing) {
      if (row.fiber.id !== choosing.fromFiberId) this.target.set(row.fiber.id);
      return;
    }
    this.selection.set({ kind: 'fiber', id: row.fiber.id });
  }

  protected onSplitterTap(id: string): void {
    if (this.choosing()) return;
    this.selection.set({ kind: 'splitter', id });
  }

  /** "Emendar": a fibra da gaveta vira a origem; a lista abre o cabo do outro lado. */
  protected startSplice(): void {
    const row = this.selectedRow();
    if (!row) return;
    this.choosing.set({ fromFiberId: row.fiber.id });
    this.target.set(null);
    this.drawerError.set(null);
    const [left, right] = defaultSpliceCables(this.store.cables());
    const other = row.fiber.cableId === left ? right : left;
    this.tab.set(other ?? row.fiber.cableId);
  }

  protected confirmSplice(): void {
    const pending = this.pending();
    if (!pending) return;
    const roleOf = (row: FiberRow) => this.rows().get(row.fiber.id)?.cable.role;
    const sides = spliceSides(
      { fiberId: pending.from.fiber.id, role: roleOf(pending.from) },
      { fiberId: pending.to.fiber.id, role: roleOf(pending.to) },
    );
    this.store.spliceFibers(pending.choice, sides, (error, spliceId) => {
      if (error) {
        this.drawerError.set(error);
        return;
      }
      this.choosing.set(null);
      this.target.set(null);
      this.drawerError.set(null);
      this.selection.set(spliceId ? { kind: 'splice', id: spliceId } : null);
    });
  }

  protected cancelSplice(): void {
    this.choosing.set(null);
    this.target.set(null);
    this.drawerError.set(null);
  }

  protected closeDrawer(): void {
    if (this.pending()) {
      this.cancelSplice();
      return;
    }
    this.selection.set(null);
    this.drawerError.set(null);
  }

  protected undoSplice(splice: SpliceResponse): void {
    if (!splice.id) return;
    const id = splice.id;
    const where =
      splice.positionNumber !== undefined ? `a emenda da posição ${splice.positionNumber}` : 'esta emenda';
    this.confirm(where, () => {
      this.store.deleteSplice(id);
      this.selection.set(null);
    });
  }

  protected deleteTray(tray: TrayResponse): void {
    if (!tray.id) return;
    const id = tray.id;
    this.confirm(`a bandeja ${tray.trayNumber}`, () => this.store.deleteTray(id));
  }

  protected trace(target: DrawerTrace): void {
    void this.router.navigate(['/'], { queryParams: { trace: `${target.kind}:${target.id}` } });
  }

  protected retry(): void {
    this.store.reload();
  }

  /** Volta ao mapa com a caixa selecionada; centraliza se ela não estava selecionada. */
  protected back(): void {
    const key = `box:${this.boxId()}`;
    const selection = this.mapState.selection();
    const wasSelected = selection?.type === 'element' && selection.key === key;
    this.mapReturn.request({ type: 'element', key }, !wasSelected);
    void this.router.navigate(['/']);
  }

  /** "Ver cabo no mapa" e "Abrir ficha do cabo": volta ao mapa com o cabo selecionado. */
  protected viewCable(cableId: string): void {
    this.mapReturn.request({ type: 'cable', id: cableId }, true);
    void this.router.navigate(['/']);
  }

  private usedOf(tray: TrayResponse): number {
    return (
      tray.usedPositions ??
      this.store.splices().filter((splice) => splice.trayNumber === tray.trayNumber).length
    );
  }

  /** "CABO-01 · 1 Verde". */
  private fiberName(row: FiberRow): string {
    const color = row.fiber.color ? ` ${opticalColor(row.fiber.color).label}` : '';
    return `${row.fiber.cableName} · ${row.fiber.numberInTube}${color}`;
  }

  private confirm(what: string, action: () => void): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Confirmar exclusão',
          message: `Excluir ${what}? A ação não pode ser desfeita.`,
          confirmLabel: 'Excluir',
          danger: true,
        },
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) action();
      });
  }
}
