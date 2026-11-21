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
import { NetworkMapState } from '../../core/network/network-map-state';
import { groupDefinition, statusDefinition } from '../../core/network/network-catalog';
import { MapReturnService } from '../../core/services/map-return';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { BoxSheetStore } from '../network-map/box-sheet/box-sheet-store';
import { CableStripComponent } from './cable-strip';
import { SpliceDetailComponent } from './splice-detail';
import { SplicePickerComponent } from './splice-picker';
import { TrayBoardComponent } from './tray-board';

/** O que o painel lateral (ou de baixo, no celular) mostra. */
type Panel =
  | { kind: 'pick'; trayNumber: number; position: number }
  | { kind: 'detail'; spliceId: string }
  | null;

/** Capacidades oferecidas ao criar uma bandeja (as mesmas da ficha da caixa). */
const TRAY_CAPACITIES = [6, 12, 24, 36, 48] as const;

/**
 * Tela de fusões da caixa (`/caixas/:boxId/fusoes`): os cabos no topo, a bandeja como a física no
 * centro e o painel para emendar numa posição vazia ou consultar uma emenda. Tem endereço próprio
 * para mandar o link a outro técnico.
 */
@Component({
  selector: 'app-box-splices-page',
  imports: [
    CableStripComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    SpliceDetailComponent,
    SplicePickerComponent,
    TrayBoardComponent,
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

  protected readonly capacities = TRAY_CAPACITIES;
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

  private readonly chosenTray = signal<number | null>(null);
  protected readonly tray = computed<TrayResponse | null>(() => {
    const trays = this.store.trays();
    return trays.find((tray) => tray.trayNumber === this.chosenTray()) ?? trays[0] ?? null;
  });
  protected readonly trayIsEmpty = computed(() => {
    const number = this.tray()?.trayNumber;
    return !this.store.splices().some((splice) => splice.trayNumber === number);
  });

  protected readonly addingTray = signal(false);
  protected readonly panel = signal<Panel>(null);

  /** Emenda aberta no cartão; some sozinha quando a emenda é excluída. */
  protected readonly detail = computed<SpliceResponse | null>(() => {
    const panel = this.panel();
    if (panel?.kind !== 'detail') return null;
    return this.store.splices().find((splice) => splice.id === panel.spliceId) ?? null;
  });
  protected readonly pick = computed(() => {
    const panel = this.panel();
    return panel?.kind === 'pick' ? panel : null;
  });
  protected readonly selectedPosition = computed(() => {
    const pick = this.pick();
    if (pick) return pick.position;
    return this.detail()?.positionNumber ?? null;
  });
  protected readonly panelOpen = computed(() => !!this.pick() || !!this.detail());

  constructor() {
    effect(() => {
      const id = this.boxId();
      untracked(() => {
        if (id) this.store.open(id);
      });
    });
  }

  protected usedOf(tray: TrayResponse): number {
    return (
      tray.usedPositions ??
      this.store.splices().filter((splice) => splice.trayNumber === tray.trayNumber).length
    );
  }

  protected selectTray(trayNumber: number | undefined): void {
    this.chosenTray.set(trayNumber ?? null);
    this.panel.set(null);
  }

  protected addTray(capacity: number): void {
    this.addingTray.set(false);
    this.store.addTray(capacity);
  }

  protected deleteTray(): void {
    const tray = this.tray();
    if (!tray?.id) return;
    const id = tray.id;
    this.confirm(`a bandeja ${tray.trayNumber}`, () => this.store.deleteTray(id));
  }

  protected openPosition(position: number): void {
    const trayNumber = this.tray()?.trayNumber;
    if (trayNumber === undefined || !this.canEdit()) return;
    this.panel.set({ kind: 'pick', trayNumber, position });
  }

  protected openSplice(splice: SpliceResponse): void {
    if (splice.id) this.panel.set({ kind: 'detail', spliceId: splice.id });
  }

  protected closePanel(): void {
    this.panel.set(null);
  }

  protected deleteSplice(splice: SpliceResponse): void {
    if (!splice.id) return;
    const id = splice.id;
    const where =
      splice.positionNumber !== undefined
        ? `a emenda da posição ${splice.positionNumber}`
        : 'esta emenda';
    this.confirm(where, () => this.store.deleteSplice(id));
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
  /** Abre o rastreio da emenda no mapa (a tela de fusões fecha; o mapa mostra o caminho). */
  protected traceSplice(spliceId: string): void {
    void this.router.navigate(['/'], { queryParams: { trace: `SPLICE:${spliceId}` } });
  }

  protected viewCable(cableId: string): void {
    this.mapReturn.request({ type: 'cable', id: cableId }, true);
    void this.router.navigate(['/']);
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
