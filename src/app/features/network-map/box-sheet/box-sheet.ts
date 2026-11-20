import { NgTemplateOutlet } from '@angular/common';
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
import { TermHintComponent } from '../../../shared/help/term-hint';
import { DiagramLineComponent } from '../../../shared/diagram/diagram-line.component';
import { OccupancyBadgeComponent } from '../../../shared/common/occupancy-badge.component';
import { SheetTabsComponent } from '../../../shared/common/sheet-tabs';
import { UnifilarSummaryComponent } from '../../../shared/diagram/unifilar-summary';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, filter, map } from 'rxjs';
import {
  AttachedCableResponse,
  ConnectionResponse,
  ServicePortResponse,
  SplitterPortResponse,
  SplitterRatio,
  SplitterResponse,
} from '../../../core/api/api-types';
import {
  DEFAULT_ENDS,
  DiagramEnd,
  DiagramMiddle,
  SPLITTER_RATIOS,
  connectorMiddle,
  describeServicePortSource,
  diagramEnd,
  fiberLabel,
  outputNumber,
  splitterLabel,
} from '../../../core/network/box-interior';
import { lineStateOf } from '../../../core/network/line-state-style';
import { Occupancy, servicePortOccupancy, splitterOccupancy } from '../../../core/network/occupancy';
import { boxSides } from '../../../core/network/unifilar';
import { describeTraySummary } from '../../../core/network/splice-board';
import { MapElement } from '../../../core/network/map-element';
import {
  groupDefinition,
  roleDefinition,
  statusDefinition,
} from '../../../core/network/network-catalog';
import { portStatusDefinition } from '../../../core/network/optical-catalog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/ui/confirm-dialog';
import { boxTabs } from '../sheet-support';
import { BoxSheetStore, PortSource } from './box-sheet-store';
import {
  FiberLinkData,
  FiberLinkDialogComponent,
  FiberLinkResult,
  FiberSlot,
} from './fiber-link-dialog';

const ATTACHMENT_LABELS: Record<string, string> = {
  START: 'Começa aqui',
  PASS_THROUGH: 'Passa por aqui',
  END: 'Termina aqui',
};

/** Saída livre de um splitter, para servir de origem a uma porta de atendimento. */
interface FreeOutput {
  splitterPortId: string;
  label: string;
}

/**
 * Ficha da caixa selecionada: cabos, bandejas e fusões, conectores, splitters e portas de
 * atendimento, com um resumo em linguagem simples no topo.
 */
@Component({
  selector: 'app-box-sheet',
  imports: [
    TermHintComponent,
    DiagramLineComponent,
    OccupancyBadgeComponent,
    SheetTabsComponent,
    UnifilarSummaryComponent,
    NgTemplateOutlet,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './box-sheet.html',
  styleUrls: ['../sheet-frame.scss', './box-sheet.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoxSheetComponent {
  protected readonly store = inject(BoxSheetStore);
  private readonly dialog = inject(MatDialog);

  readonly box = input.required<MapElement>();
  readonly canEdit = input(true);

  readonly closed = output<void>();
  readonly editData = output<void>();
  readonly openCable = output<string>();
  /** "Ver fusões": abre a tela de fusões desta caixa. */
  readonly openSplices = output<void>();

  protected readonly ratios = SPLITTER_RATIOS;
  protected readonly newRatio = signal<SplitterRatio>('RATIO_1_8');
  protected readonly newBalanced = signal(true);
  protected readonly newWithPorts = signal(true);

  protected readonly group = computed(() => groupDefinition(this.box().group));
  protected readonly status = computed(() => statusDefinition(this.box().status));
  protected readonly isCto = computed(() => this.box().group === 'CTO');

  /** Aba aberta; volta para o Resumo sempre que outra caixa é selecionada. */
  protected readonly tab = linkedSignal<string, string>({
    source: () => this.box().id,
    computation: () => 'resumo',
  });
  protected readonly tabs = computed(() =>
    boxTabs(
      this.box().group,
      this.store.trays().length > 0 || this.store.connectors().length > 0,
    ),
  );
  protected readonly sides = computed(() => boxSides(this.store.cables()));
  protected readonly lineState = computed(() => lineStateOf(this.box().status));
  protected readonly spliceSummary = computed(() =>
    describeTraySummary(this.store.splices().length, this.store.trays().length),
  );
  protected readonly portUse = computed(() => servicePortOccupancy(this.store.servicePorts()));

  protected readonly freeOutputs = computed<FreeOutput[]>(() =>
    this.store.splitters().flatMap((splitter) =>
      (splitter.ports ?? [])
        .filter((port) => port.direction === 'OUTPUT' && !port.servicePortId && !port.fiberId)
        .map((port) => ({
          splitterPortId: port.id ?? '',
          label: `${splitterLabel(splitter)}, saída ${outputNumber(port)}`,
        })),
    ),
  );

  // --- Textos -----------------------------------------------------------------

  protected attachmentLabel(cable: AttachedCableResponse): string {
    return ATTACHMENT_LABELS[cable.attachmentRole ?? ''] ?? '';
  }

  protected roleLabel(cable: AttachedCableResponse): string {
    return cable.role ? roleDefinition(cable.role).label : '';
  }

  protected fiber(id: string | undefined): string {
    return fiberLabel(id ? this.store.fiberIndex().get(id) : undefined);
  }

  protected splitterName(splitter: SplitterResponse): string {
    return splitterLabel(splitter);
  }

  protected inputOf(splitter: SplitterResponse): SplitterPortResponse | undefined {
    return splitter.ports?.find((port) => port.direction === 'INPUT');
  }

  protected outputsOf(splitter: SplitterResponse): SplitterPortResponse[] {
    return (splitter.ports ?? []).filter((port) => port.direction === 'OUTPUT');
  }

  protected outputNumber(port: SplitterPortResponse): number {
    return outputNumber(port);
  }

  protected outputTarget(port: SplitterPortResponse): string {
    if (port.servicePortId) {
      const service = this.store.servicePorts().find((item) => item.id === port.servicePortId);
      const customer = service?.customerId
        ? this.store.customers().get(service.customerId)?.name
        : undefined;
      const name = `Porta de atendimento ${service?.portNumber ?? '?'}`;
      return customer ? `${name} (${customer})` : name;
    }
    if (port.fiberId) return this.fiber(port.fiberId);
    return 'livre';
  }

  protected portSource(port: ServicePortResponse): string {
    return describeServicePortSource(port, this.store.splitters(), this.store.fiberIndex());
  }

  protected portStatus(port: ServicePortResponse) {
    return portStatusDefinition(port.status);
  }

  protected customerName(port: ServicePortResponse): string | null {
    if (!port.customerId) return null;
    return this.store.customers().get(port.customerId)?.name ?? 'Cliente';
  }

  /** Ponta do diagrama: sem fibra = nada ligado; fibra fora dos cabos da caixa = outro cabo. */
  protected end(id: string | undefined): DiagramEnd | undefined {
    if (!id) return undefined;
    return diagramEnd(this.store.fiberIndex().get(id)) ?? { cable: 'Fibra de outro cabo' };
  }

  protected connectorMiddle(): DiagramMiddle {
    return connectorMiddle();
  }

  protected splitterUse(splitter: SplitterResponse): Occupancy {
    return splitterOccupancy(splitter);
  }

  // --- Conectores ---------------------------------------------------------------

  protected newConnector(): void {
    this.pickFibers({
      title: 'Nova conexão por conector',
      intro: 'O conector liga duas fibras de forma removível (por exemplo, num DIO).',
      slots: [
        { label: 'Primeira fibra', defaultEnd: DEFAULT_ENDS.connectorA },
        { label: 'Segunda fibra', defaultEnd: DEFAULT_ENDS.connectorB },
      ],
      showAttenuation: true,
      confirmLabel: 'Registrar conexão',
    }).subscribe(({ choices: [a, b], attenuationDb }) =>
      this.store.addConnector({
        fiberAId: a.fiberId,
        fiberAEnd: a.fiberEnd,
        fiberBId: b.fiberId,
        fiberBEnd: b.fiberEnd,
        ...(attenuationDb !== undefined ? { attenuationDb } : {}),
      }),
    );
  }

  protected deleteConnector(connection: ConnectionResponse): void {
    if (!connection.id) return;
    const id = connection.id;
    this.confirmDelete('esta conexão', () => this.store.deleteConnector(id));
  }

  // --- Splitters ----------------------------------------------------------------

  protected addSplitter(): void {
    this.store.addSplitter(this.newRatio(), this.newBalanced(), this.isCto() && this.newWithPorts());
  }

  protected deleteSplitter(splitter: SplitterResponse): void {
    if (!splitter.id) return;
    const id = splitter.id;
    this.confirmDelete(`o ${splitterLabel(splitter)}`, () => this.store.deleteSplitter(id));
  }

  protected linkSplitterPort(splitter: SplitterResponse, port: SplitterPortResponse): void {
    const isInput = port.direction === 'INPUT';
    const slot: FiberSlot = {
      label: isInput ? 'Fibra que alimenta o splitter' : 'Fibra que sai desta saída',
      defaultEnd: isInput ? DEFAULT_ENDS.splitterInput : DEFAULT_ENDS.splitterOutput,
      current: port.fiberId,
    };
    this.pickFibers({
      title: isInput ? 'Entrada do splitter' : `Saída ${outputNumber(port)} do splitter`,
      slots: [slot],
      confirmLabel: 'Ligar',
    }).subscribe(({ choices: [choice] }) =>
      this.store.linkSplitterPort(splitter.id ?? '', port, choice),
    );
  }

  protected unlinkSplitterPort(splitter: SplitterResponse, port: SplitterPortResponse): void {
    this.store.linkSplitterPort(splitter.id ?? '', port, null);
  }

  // --- Portas de atendimento ----------------------------------------------------

  protected newServicePort(source: 'none' | 'fiber' | FreeOutput): void {
    if (source === 'none') {
      this.store.addServicePort({});
    } else if (source === 'fiber') {
      this.pickPortFiber(undefined).subscribe((choice) => this.store.addServicePort(choice));
    } else {
      this.store.addServicePort({ splitterPortId: source.splitterPortId });
    }
  }

  protected setPortSource(port: ServicePortResponse, source: 'none' | 'fiber' | FreeOutput): void {
    if (source === 'fiber') {
      this.pickPortFiber(port.fiberId).subscribe((choice) =>
        this.store.setServicePortSource(port, choice),
      );
      return;
    }
    const value: PortSource =
      source === 'none' ? null : { splitterPortId: source.splitterPortId };
    this.store.setServicePortSource(port, value);
  }

  protected deleteServicePort(port: ServicePortResponse): void {
    if (!port.id) return;
    const id = port.id;
    this.confirmDelete(`a porta ${port.portNumber}`, () => this.store.deleteServicePort(id));
  }

  private pickPortFiber(current: string | undefined) {
    return this.pickFibers({
      title: 'Ligar porta a uma fibra',
      intro: 'Use quando a porta recebe sinal direto de uma fibra, sem splitter nesta caixa.',
      slots: [{ label: 'Fibra', defaultEnd: DEFAULT_ENDS.servicePort, current }],
      confirmLabel: 'Ligar',
    }).pipe(map(({ choices: [choice] }) => choice));
  }

  // --- Apoio --------------------------------------------------------------------

  private pickFibers(data: Omit<FiberLinkData, 'fibers'>): Observable<FiberLinkResult> {
    return this.dialog
      .open<FiberLinkDialogComponent, FiberLinkData, FiberLinkResult>(FiberLinkDialogComponent, {
        data: { ...data, fibers: this.store.fiberIndex() },
        width: '560px',
        maxWidth: '94vw',
      })
      .afterClosed()
      .pipe(filter((result): result is FiberLinkResult => !!result));
  }

  private confirmDelete(what: string, action: () => void): void {
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
