import { CreateBannerComponent } from '../../shared/map/create-banner';
import { SHEET_OPEN } from '../../core/network/sheet-drag';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { TraceSheetComponent } from '../trace/trace-sheet';
import { TraceStore } from '../trace/trace-store';
import { TraceDirection, TraceKind } from '../../core/api/trace-types';
import { parseTraceQuery } from '../../core/network/trace-view';
import { tracePaths, traceMarkers } from '../../core/network/trace-map';
import { ImpactSheetComponent } from '../impact/impact-sheet';
import { ImpactStore } from '../impact/impact-store';
import { ImpactKind } from '../../core/api/impact-types';
import { ImpactMarker, impactMarkers, impactTargetPath } from '../../core/network/impact-view';
import { Observable, map } from 'rxjs';
import { BoxType, CableRole, InfrastructureStatus } from '../../core/api/api-types';
import { BASE_LAYERS, DEFAULT_MAP_VIEW } from '../../core/constants/map.constants';
import {
  ElementMoveEvent,
  GeoPath,
  GeoPoint,
  MapClickEvent,
  MapTool,
  MapViewState,
  PathVertexMoveEvent,
} from '../../core/models/geo.model';
import { buildLegendSections } from '../../core/network/legend-sections';
import { MapCable, MapElement } from '../../core/network/map-element';
import {
  CABLE_ROLES,
  ELEMENT_GROUPS,
  ElementGroup,
  cableLineStyle,
  roleDefinition,
  statusDefinition,
} from '../../core/network/network-catalog';
import { NetworkMapRepository } from '../../core/network/network-map-repository';
import { LegendGroupKey, NetworkMapState, Selection } from '../../core/network/network-map-state';
import { MapPreferencesService } from '../../core/services/map-preferences';
import { MapReturnService } from '../../core/services/map-return';
import { MapViewportService } from '../../core/services/map-viewport';
import { NotificationService } from '../../core/services/notification';
import {
  CableEndSuggestion,
  CableFormData,
  CableFormDialogComponent,
} from '../../shared/cable/cable-form-dialog';
import { EDIT_ACTION, GeoMapComponent } from '../../shared/map/geo-map';
import { LegendGroup, LegendLeaf, MapLegendComponent } from '../../shared/map/map-legend';
import { MapLayerPanelComponent } from '../../shared/map/map-layer-panel';
import { MapStatusBarComponent } from '../../shared/map/map-status-bar';
import { MapToolbarComponent } from '../../shared/map/map-toolbar';
import { pathClickAction } from './path-click';
import { MapTypePickerComponent, TypePickerOption } from '../../shared/map/map-type-picker';
import { popupHtml } from '../../shared/map/pin-marker';
import { BoxFormData, BoxFormDialogComponent } from '../../shared/network/box-form-dialog';
import { OltFormData, OltFormDialogComponent } from '../../shared/network/olt-form-dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { RouteItem, isSameVertex } from '../../core/network/cable-route';
import { describeCableEnds } from './cable-ends';
import { BoxSheetComponent } from './box-sheet/box-sheet';
import { BoxSheetStore } from './box-sheet/box-sheet-store';
import { CableSheetComponent } from './cable-sheet/cable-sheet';
import { CableSheetStore } from './cable-sheet/cable-sheet-store';
import { CustomerSheetComponent } from './customer-sheet/customer-sheet';
import { describeView } from '../../core/network/view-summary';
import { GlossaryDialogComponent } from '../../shared/help/glossary-dialog';
import { ViewHelpData, ViewHelpDialogComponent } from '../../shared/help/view-help-dialog';
import {
  CustomerFormData,
  CustomerFormDialogComponent,
} from '../../shared/network/customer-form-dialog';
import { CustomerStatus } from '../../core/api/api-types';
import { OltSheetComponent } from './olt-sheet/olt-sheet';
import { OltSheetStore } from './olt-sheet/olt-sheet-store';
import { NetworkSidebarComponent } from './network-sidebar/network-sidebar';
import { AuthSession } from '../../core/auth/auth-session';
import { roleText } from '../../core/auth/roles';

/** Grupos que a ferramenta "Adicionar elemento" cria (OLT, caixas e clientes). */
type CreatableGroup = ElementGroup;

const CREATABLE_GROUPS = ELEMENT_GROUPS;

/**
 * Tela do mapa da rede. Os dados vêm da API pelo `NetworkMapRepository`; a seleção,
 * a busca e os filtros vivem no `NetworkMapState`. Esta página só liga as peças:
 * ferramentas, diálogos, legenda e o mapa.
 */
@Component({
  selector: 'app-network-map-page',
  imports: [
    CreateBannerComponent,
    BoxSheetComponent,
    CableSheetComponent,
    CustomerSheetComponent,
    GeoMapComponent,
    MatButtonModule,
    MatIconModule,
    MapLayerPanelComponent,
    OltSheetComponent,
    TraceSheetComponent,
    ImpactSheetComponent,
    MapLegendComponent,
    MapStatusBarComponent,
    MapToolbarComponent,
    MapTypePickerComponent,
    NetworkSidebarComponent,
  ],
  templateUrl: './network-map-page.html',
  styleUrl: './network-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BoxSheetStore, CableSheetStore, OltSheetStore, TraceStore, ImpactStore],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class NetworkMapPage implements OnInit {
  private readonly repository = inject(NetworkMapRepository);
  protected readonly sheet = inject(CableSheetStore);
  private readonly boxSheet = inject(BoxSheetStore);
  private readonly oltSheet = inject(OltSheetStore);
  private readonly state = inject(NetworkMapState);
  private readonly preferences = inject(MapPreferencesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  protected readonly session = inject(AuthSession);
  protected readonly roleLabel = computed(() => roleText(this.session.role()));
  private readonly viewport = inject(MapViewportService);
  private readonly mapReturn = inject(MapReturnService);
  private readonly router = inject(Router);
  private readonly geoMap = viewChild.required(GeoMapComponent);

  protected readonly baseLayers = BASE_LAYERS;
  protected readonly preferencesState = this.preferences;

  protected readonly trace = inject(TraceStore);
  protected readonly impact = inject(ImpactStore);
  private readonly route = inject(ActivatedRoute);
  /** Traçados do rastreio aberto somados aos do mapa. */
  protected readonly mapPaths = computed<readonly GeoPath[]>(() => {
    const response = this.trace.response();
    const impactResponse = this.impact.response();
    const extra: GeoPath[] = response ? [...tracePaths(response)] : [];
    const target = impactResponse ? impactTargetPath(impactResponse) : null;
    if (target) extra.push(target);
    return extra.length > 0 ? [...this.paths(), ...extra] : this.paths();
  });
  protected readonly traceBreaks = computed(() => {
    const response = this.trace.response();
    return response ? traceMarkers(response).markers : [];
  });
  protected readonly impactMarkerList = computed<readonly ImpactMarker[]>(() => {
    const response = this.impact.response();
    return response ? impactMarkers(response) : [];
  });
  /** A ficha do impacto aparece só quando nenhuma outra ficha está aberta. */
  protected readonly impactSheetOpen = computed(
    () =>
      !!this.impact.query() &&
      !this.selectedCable() &&
      !this.selectedBox() &&
      !this.selectedOlt() &&
      !this.selectedCustomer(),
  );
  /** A ficha do rastreio aparece só quando nenhuma outra ficha está aberta. */
  protected readonly traceSheetOpen = computed(
    () =>
      !!this.trace.query() &&
      !this.selectedCable() &&
      !this.selectedBox() &&
      !this.selectedOlt() &&
      !this.selectedCustomer(),
  );

  protected readonly loadState = this.repository.loadState;
  /** Ferramentas de edição liberadas: rede carregada e permissão de edição. */
  protected readonly editable = computed(
    () => this.loadState() === 'ready' && this.state.canEdit(),
  );

  protected readonly elements = this.state.visibleElements;
  protected readonly search = this.state.search;
  protected readonly hasActiveFilters = this.state.hasActiveFilters;
  protected readonly activeStatuses = computed<readonly InfrastructureStatus[]>(() => [
    ...this.state.statusFilter(),
  ]);
  protected readonly totalElements = computed(() => this.repository.elements().length);
  protected readonly totalCables = computed(() => this.repository.mapCables().length);
  protected readonly visibleCount = computed(() => this.elements().length);
  protected readonly visibleCableCount = computed(() => this.state.visibleCables().length);

  protected readonly selectedElementKey = computed(() => {
    const selection = this.state.selection();
    return selection?.type === 'element' ? selection.key : null;
  });
  protected readonly selectedCableId = computed(() => {
    const selection = this.state.selection();
    return selection?.type === 'cable' ? selection.id : null;
  });

  /** Seleção de onde o rastreio partiu: o botão Voltar devolve a tela a ela. */
  private readonly traceOrigin = signal<Selection>(null);
  protected readonly traceHasOrigin = computed(() => this.traceOrigin() !== null);

  protected readonly activeTool = signal<MapTool>('select');
  /** Tipo criado pela ferramenta "Adicionar elemento". */
  protected readonly activeGroup = signal<CreatableGroup>('CTO');
  /** Função do cabo traçado pela ferramenta "Traçar cabo". */
  protected readonly activeRole = signal<CableRole>('DISTRIBUTION');
  /** Vértices do traçado em construção. */
  protected readonly cableDraftPoints = signal<readonly GeoPoint[]>([]);
  /** Elemento (OLT/caixa) em que cada vértice do traçado encaixou, ou `null`. */
  private readonly cableDraftSnaps = signal<readonly (CableEndSuggestion | null)[]>([]);
  /** Cabo selecionado (abre a ficha). */
  protected readonly selectedCable = this.state.selectedCable;

  /** Caixa selecionada (abre a ficha da caixa). */
  protected readonly selectedBox = computed(() => {
    const element = this.state.selectedElement();
    return element?.kind === 'box' ? element : null;
  });

  /** Cliente selecionado (abre a ficha do cliente). */
  protected readonly selectedCustomer = computed(() => {
    const element = this.state.selectedElement();
    return element?.kind === 'customer' ? element : null;
  });

  /** OLT selecionada (abre a ficha da OLT). */
  protected readonly selectedOlt = computed(() => {
    const element = this.state.selectedElement();
    return element?.kind === 'olt' ? element : null;
  });

  /** Alguma ficha aberta: no celular, a ajuda sai da frente dela. */
  protected readonly anySheetOpen = computed(
    () => !!this.state.selectedElement() || !!this.selectedCable() || !!this.trace.query() || !!this.impact.query(),
  );

  /** Início e fim do cabo selecionado para o balão, vindos da ficha. */
  private readonly cableEnds = computed<string | null>(() => {
    const id = this.selectedCableId();
    if (!id || this.sheet.cableId() !== id) return null;
    switch (this.sheet.state()) {
      case 'ready':
        return describeCableEnds(this.sheet.attachments());
      case 'error':
        return 'Não foi possível carregar o início e o fim';
      default:
        return 'Carregando início e fim...';
    }
  });

  /** Elementos destacados no mapa: os da lista do cabo aberto na ficha. */
  protected readonly highlightedKeys = computed<ReadonlySet<string>>(() =>
    this.sheet.cableId() ? this.sheet.elementKeys() : new Set(),
  );

  /** OLTs e caixas que podem entrar na lista de um cabo, por nome. */
  protected readonly routeCandidates = computed<readonly RouteItem[]>(() =>
    [
      ...this.repository.olts().map((olt) => ({
        ref: { kind: 'olt' as const, id: olt.id ?? '' },
        name: olt.name ?? 'OLT sem nome',
      })),
      ...this.repository.boxes().map((box) => ({
        ref: { kind: 'box' as const, id: box.id ?? '' },
        name: box.name ?? 'Caixa sem nome',
      })),
    ]
      .filter((item) => item.ref.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );

  /** Nome de cada OLT/caixa pelo id. */
  protected readonly elementNames = computed<ReadonlyMap<string, string>>(
    () => new Map(this.routeCandidates().map((item) => [item.ref.id, item.name])),
  );

  protected readonly pickerVisible = signal(true);
  protected readonly showLayerPanel = signal(false);
  protected readonly pointer = signal<GeoPoint | null>(null);
  protected readonly view = signal<MapViewState | null>(null);

  protected readonly initialCenter = computed<GeoPoint>(
    () => this.preferences.lastView()?.center ?? DEFAULT_MAP_VIEW.center,
  );
  protected readonly initialZoom = computed<number>(
    () => this.preferences.lastView()?.zoom ?? DEFAULT_MAP_VIEW.zoom,
  );

  protected readonly isCreating = computed(
    () => this.activeTool() === 'addElement' || this.activeTool() === 'addCable',
  );
  protected readonly showPicker = computed(() => this.isCreating() && this.pickerVisible());
  /** Faixa "Criar …" no topo: aparece quando a escolha do tipo fecha. */
  protected readonly createLabel = computed<string | null>(() => {
    if (!this.isCreating() || this.pickerVisible()) return null;
    if (this.activeTool() === 'addCable') {
      return `cabo de ${roleDefinition(this.activeRole()).label.toLowerCase()}`;
    }
    const label = CREATABLE_GROUPS.find((group) => group.group === this.activeGroup())?.label ?? '';
    return label === label.toUpperCase() ? label : label.toLowerCase();
  });

  /** Cor do elemento em criação — usada no marcador fantasma e na linha-guia. */
  protected readonly previewColor = computed<string | null>(() => {
    if (this.activeTool() === 'addElement') {
      return CREATABLE_GROUPS.find((group) => group.group === this.activeGroup())?.color ?? null;
    }
    if (this.activeTool() === 'addCable') {
      return roleDefinition(this.activeRole()).color;
    }
    return null;
  });

  /** Último vértice do traçado, usado para a linha-guia até o cursor. */
  protected readonly draftOrigin = computed<GeoPoint | null>(() => {
    if (this.activeTool() !== 'addCable') {
      return null;
    }
    const points = this.cableDraftPoints();
    return points.length > 0 ? points[points.length - 1] : null;
  });

  /** Linhas dos cabos (estilo por função e situação) e a pré-visualização do traçado. */
  protected readonly paths = computed<readonly GeoPath[]>(() => {
    const selectedId = this.selectedCableId();
    const endsText = this.cableEnds();
    const action = this.editable() ? EDIT_ACTION : null;

    const result: GeoPath[] = this.state.visibleCables().map((cable) => {
      const style = cableLineStyle(cable.role, cable.status);
      const extra = cable.id === selectedId ? endsText : null;
      return {
        id: cable.id,
        points: [...cable.points],
        color: style.color,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
        popupHtml: cablePopupHtml(cable, extra, action),
      };
    });

    const draft = this.cableDraftPoints();
    if (this.activeTool() === 'addCable' && draft.length > 0) {
      const definition = roleDefinition(this.activeRole());
      result.push({
        id: '__draft__',
        points: [...draft],
        color: definition.color,
        weight: definition.weight + 1,
        dashArray: '6 6',
      });
    }
    return result;
  });

  protected readonly elementOptions = computed<readonly TypePickerOption[]>(() => {
    const elements = this.repository.elements();
    return CREATABLE_GROUPS.map((group) => ({
      key: group.group,
      label: group.label,
      code: group.code,
      color: group.color,
      count: elements.filter((element) => element.group === group.group).length,
    }));
  });

  protected readonly roleOptions = computed<readonly TypePickerOption[]>(() => {
    const cables = this.repository.mapCables();
    return CABLE_ROLES.map((role) => ({
      key: role.role,
      label: role.label,
      code: role.code,
      color: role.color,
      count: cables.filter((cable) => cable.role === role.role).length,
    }));
  });

  /** Legenda: lista o que passa pela busca/situação; o olho oculta grupos no mapa. */
  protected readonly legendSections = computed(() =>
    buildLegendSections(
      this.state.filteredElements(),
      this.state.filteredCables(),
      this.state.hiddenGroups(),
      this.state.canEdit(),
    ),
  );

  constructor() {
    // A ficha acompanha a seleção: abre com o cabo selecionado e fecha sem ele.
    effect(() => {
      const cable = this.selectedCable();
      untracked(() => {
        if (cable) this.closeInspectors();
        if (cable) this.sheet.open(cable.id);
        else this.sheet.close();
      });
    });
    effect(() => {
      const box = this.selectedBox();
      untracked(() => {
        if (box) this.closeInspectors();
        if (box) this.boxSheet.open(box.id);
        else this.boxSheet.close();
      });
    });
    effect(() => {
      const olt = this.selectedOlt();
      untracked(() => {
        if (olt) this.closeInspectors();
        if (olt) this.oltSheet.open(olt.id);
        else this.oltSheet.close();
      });
    });
    // Volta de outra tela (ex.: fusões): seleciona o que foi pedido quando a rede carregar e o
    // mapa Leaflet existir (`viewport.ready` lê um signal, então o efeito roda de novo).
    effect(() => {
      if (this.loadState() !== 'ready' || !this.viewport.ready) return;
      untracked(() => this.applyReturn());
    });

    // Rastreio aberto: enquadra o caminho e as quebras no mapa.
    effect(() => {
      const response = this.trace.response();
      if (!response || !this.viewport.ready) return;
      untracked(() => {
        const points = [
          ...tracePaths(response).flatMap((path) => path.points),
          ...traceMarkers(response).markers.map((marker) => marker.point),
        ];
        if (points.length > 0) this.viewport.focusAll(points);
      });
    });

    // Impacto aberto: enquadra o item e os afetados.
    effect(() => {
      const response = this.impact.response();
      if (!response || !this.viewport.ready) return;
      untracked(() => {
        const points = [
          ...(impactTargetPath(response)?.points ?? []),
          ...impactMarkers(response).map((marker) => marker.point),
        ];
        if (points.length > 0) this.viewport.focusAll(points);
      });
    });

    // Endereço direto com ?trace=KIND:ID (ex.: volta da tela de fusões).
    const fromUrl = parseTraceQuery(this.route.snapshot.queryParamMap.get('trace'));
    if (fromUrl) {
      this.trace.open(fromUrl.kind, fromUrl.id);
    }
  }

  /** Abre o impacto de manutenção de um cabo, caixa ou OLT. Substitui as outras fichas. */
  protected openImpact(kind: ImpactKind, id: string): void {
    this.state.select(null);
    this.closeTrace();
    this.impact.open(kind, id);
  }

  /** Fecha o rastreio e o impacto: nenhum dos dois fica aberto junto de outra ficha. */
  private closeInspectors(): void {
    this.closeTrace();
    this.impact.close();
  }

  /** Enquadra uma caixa afetada, pela posição dela na resposta do impacto. */
  protected focusImpactBox(boxId: string): void {
    const box = this.impact.response()?.boxes?.find((item) => item.id === boxId);
    const point = box?.coordinates?.[0];
    if (point) this.viewport.focusAll([{ lat: point.latitude, lng: point.longitude }]);
  }

  /** Abre o rastreio de um ponto. A ficha do rastreio substitui as outras fichas. */
  protected openTrace(kind: TraceKind, id: string, direction: TraceDirection = 'UPSTREAM'): void {
    if (!this.trace.query()) this.traceOrigin.set(this.state.selection());
    this.state.select(null);
    this.impact.close();
    this.trace.open(kind, id, direction);
  }

  /** Voltar sem saída aberta: fecha o rastreio e reabre o item de onde ele partiu. */
  protected leaveTrace(): void {
    const origin = this.traceOrigin();
    this.closeTrace();
    if (origin) this.state.select(origin);
  }

  protected closeTrace(): void {
    this.traceOrigin.set(null);
    this.trace.close();
  }

  private applyReturn(): void {
    const target = this.mapReturn.take();
    if (!target) return;
    if ('fit' in target) {
      this.viewport.focusAll(target.fit);
      return;
    }
    // Seleciona sempre; centralizar não mostra aviso se falhar.
    const { selection, focus } = target;
    if (selection.type === 'element') {
      const element = this.findElement(selection.key);
      if (!element) return;
      this.state.select(selection);
      if (focus) this.viewport.focus(element.position, undefined, sheetInset());
      return;
    }
    const cable = this.repository.mapCables().find((item) => item.id === selection.id);
    if (!cable) return;
    this.state.select(selection);
    if (focus) this.viewport.focusAll(cable.points, undefined, sheetInset());
  }

  /** "Ver fusões" na ficha da caixa: abre a tela de fusões. */
  protected openSplices(boxId: string): void {
    void this.router.navigate(['/caixas', boxId, 'fusoes']);
  }

  ngOnInit(): void {
    this.repository.load();
  }

  protected retryLoad(): void {
    this.repository.load();
  }

  // --- Ferramentas ---------------------------------------------------------

  protected setTool(tool: MapTool): void {
    if (tool !== 'select' && !this.editable()) {
      return;
    }
    this.clearDraft();
    this.activeTool.set(tool);
    this.pickerVisible.set(true);
    // Ao entrar na criação, nada fica selecionado: a ficha fecha e o mapa sai do foco.
    if (tool === 'addElement' || tool === 'addCable') {
      this.state.select(null);
    }

    if (tool === 'addElement') {
      this.notifications.info('Escolha o tipo e clique no mapa para criar. ESC encerra.');
    } else if (tool === 'addCable') {
      this.notifications.info(
        'Clique no mapa para traçar o cabo; clique numa OLT ou caixa para começar ou terminar nela. Duplo clique finaliza; ESC cancela.',
      );
    } else if (tool === 'move') {
      this.notifications.info('Arraste uma OLT ou caixa para corrigir a posição. ESC encerra.');
    } else if (tool === 'editCable') {
      this.notifications.info('Clique num cabo e arraste os vértices. ESC encerra.');
    }
  }

  /** ESC sai da ferramenta atual (os diálogos tratam o próprio ESC). */
  onEscape(): void {
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    if (this.sheet.picking()) {
      this.sheet.setPicking(false);
      return;
    }
    if (this.activeTool() !== 'select') {
      this.clearDraft();
      this.activeTool.set('select');
      this.notifications.info('Ferramenta encerrada.');
    }
  }

  protected reopenPicker(): void {
    this.pickerVisible.set(true);
  }

  protected closePicker(): void {
    this.pickerVisible.set(false);
  }

  protected onElementTypePicked(key: string): void {
    const group = CREATABLE_GROUPS.find((item) => item.group === key);
    if (group) {
      this.activeGroup.set(group.group);
      this.pickerVisible.set(false);
      this.notifications.info(`${group.label} selecionado. Clique no mapa para criar.`);
    }
  }

  protected onRolePicked(key: string): void {
    const role = CABLE_ROLES.find((item) => item.role === key);
    if (role) {
      this.activeRole.set(role.role);
      this.pickerVisible.set(false);
      this.notifications.info(`Cabo de ${role.label} selecionado.`);
    }
  }

  // --- Eventos do mapa -----------------------------------------------------

  protected onMapClick(event: MapClickEvent): void {
    // Escolhendo elementos para a lista do cabo: clique no vazio não fecha a ficha.
    if (this.sheet.picking()) {
      return;
    }
    if (event.tool === 'addElement') {
      this.openElementCreate(event.position);
      return;
    }
    if (event.tool === 'addCable') {
      const element = event.snappedKey ? this.findElement(event.snappedKey) : undefined;
      this.appendPoint(event.position, element);
      return;
    }
    if (event.tool === 'move' || event.tool === 'editCable') {
      return;
    }
    this.state.select(null);
  }

  /** Clique no elemento: seleciona/mostra o balão; o segundo clique abre a edição. */
  protected onElementClick(element: MapElement): void {
    if (this.sheet.picking()) {
      this.pickForCable(element);
      return;
    }
    const tool = this.activeTool();
    if (tool === 'addCable') {
      this.appendPoint(element.position, element);
      return;
    }
    if (tool === 'move' || tool === 'editCable') {
      return;
    }
    if (this.selectedElementKey() === element.key) {
      this.openElementEdit(element);
      return;
    }
    this.focusElement(element);
  }

  protected onElementDoubleClick(): void {
    this.finishCable();
  }

  protected onMapDoubleClick(): void {
    this.finishCable();
  }

  /** Clique no cabo: seleciona e busca início/fim; o segundo clique abre a edição. */
  protected onPathClick(path: GeoPath): void {
    const cable = this.repository.mapCables().find((item) => item.id === path.id);
    if (!cable) {
      return;
    }
    const action = pathClickAction(
      this.activeTool(),
      this.sheet.picking(),
      this.selectedCableId(),
      cable.id,
    );
    if (action === 'warnPicking') {
      this.notifications.info('Salve ou cancele a lista antes de abrir outro cabo.');
    } else if (action === 'edit') {
      this.openCableEdit(cable.id);
    } else if (action === 'select') {
      this.state.select({ type: 'cable', id: cable.id });
    } else if (action === 'focus') {
      this.focusCable(cable);
    }
  }

  protected onPathVertexMoved(event: PathVertexMoveEvent): void {
    const cable = this.repository.mapCables().find((item) => item.id === event.pathId);
    if (!cable) {
      return;
    }
    const points = cable.points.map((point, index) =>
      index === event.index ? event.position : point,
    );
    this.repository.updateCableRoute(cable.id, points);
  }

  protected onElementMoved(event: ElementMoveEvent): void {
    // Só a ferramenta "Mover elemento", com permissão de edição, grava a posição.
    if (this.activeTool() !== 'move' || !this.editable()) {
      return;
    }
    const element = this.findElement(event.key);
    if (!element || element.kind === 'customer') {
      return;
    }
    this.repository.moveElement({ kind: element.kind, id: element.id }, event.position);
  }

  protected onViewChanged(view: MapViewState): void {
    this.view.set(view);
    this.preferences.setLastView(view);
  }

  protected onPointerMove(position: GeoPoint | null): void {
    this.pointer.set(position);
  }

  protected onLocated(position: GeoPoint): void {
    this.notifications.success(
      `Localização obtida (${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}).`,
    );
  }

  // --- Seleção e navegação -------------------------------------------------

  private findElement(key: string): MapElement | undefined {
    return this.repository.elements().find((item) => item.key === key);
  }

  private focusElement(element: MapElement): void {
    this.viewport.focus(element.position, undefined, sheetInset());
    this.state.select({ type: 'element', key: element.key });
  }

  private focusCable(cable: MapCable): void {
    if (!this.viewport.focusAll(cable.points, undefined, sheetInset())) {
      this.notifications.warning('Não foi possível enquadrar o cabo.');
      return;
    }
    this.state.select({ type: 'cable', id: cable.id });
  }

  /** "Escolher no mapa" na ficha do cabo: o elemento clicado entra no fim da lista. */
  private pickForCable(element: MapElement): void {
    if (element.kind === 'customer') {
      this.notifications.info('Clientes não entram na lista do cabo. Escolha uma OLT ou caixa.');
      return;
    }
    if (this.sheet.elementKeys().has(element.key)) {
      this.notifications.info(`${element.name} já está na lista.`);
      return;
    }
    this.sheet.addToDraft({ ref: { kind: element.kind, id: element.id }, name: element.name });
    this.notifications.info(`${element.name} entrou na lista. Clique em outro ou salve.`);
  }

  /** Clique num item da lista do cabo: centraliza sem trocar a seleção. */
  protected onRouteItemFocus(item: RouteItem): void {
    const element = this.findElement(`${item.ref.kind}:${item.ref.id}`);
    if (element) {
      this.viewport.focus(element.position, undefined, sheetInset());
    }
  }

  protected closeSheet(): void {
    this.state.select(null);
  }

  /** Clique num cabo na ficha da caixa ou da OLT: enquadra e abre a ficha do cabo. */
  protected openCableFromSheet(cableId: string): void {
    const cable = this.repository.mapCables().find((item) => item.id === cableId);
    if (cable) {
      this.focusCable(cable);
    }
  }

  // --- Ajuda ----------------------------------------------------------------

  /** "O que estou vendo?": frase do que está visível + significado das cores. */
  protected openViewHelp(): void {
    const summary = describeView({
      visible: this.elements(),
      totalElements: this.totalElements(),
      visibleCables: this.visibleCableCount(),
      totalCables: this.totalCables(),
    });
    this.dialog.open<ViewHelpDialogComponent, ViewHelpData>(ViewHelpDialogComponent, {
      data: { summary },
      width: '560px',
      maxWidth: '94vw',
    });
  }

  protected openGlossary(): void {
    this.dialog.open(GlossaryDialogComponent, { width: '600px', maxWidth: '94vw' });
  }

  /** Reativar um cliente cancelado: abre o formulário já como "Ativo" para escolher a porta. */
  protected reactivateCustomer(): void {
    const customer = this.selectedCustomer();
    if (customer) {
      this.openElementEdit(customer, 'ACTIVE');
    }
  }

  /** "Ver a CTO" na ficha do cliente. */
  protected openBoxFromSheet(boxId: string): void {
    const box = this.findElement(`box:${boxId}`);
    if (box) {
      this.focusElement(box);
    }
  }

  protected editSelectedElement(): void {
    const element = this.state.selectedElement();
    if (element) {
      this.openElementEdit(element);
    }
  }

  /** "Excluir" na ficha da caixa ou da OLT: a mesma confirmação da Legenda. */
  protected removeSelectedElement(): void {
    const element = this.state.selectedElement();
    if (element) {
      this.removeElement(element);
    }
  }

  /** "Excluir" na ficha do cabo. */
  protected removeSelectedCable(): void {
    const id = this.selectedCableId();
    if (id) {
      this.removeCable(id);
    }
  }

  /** "Toque aqui para editar" no balão: o elemento tem prioridade sobre o cabo, como no balão. */
  protected onPopupEdit(): void {
    if (this.state.selectedElement()) {
      this.editSelectedElement();
    } else {
      this.editSelectedCable();
    }
  }

  protected editSelectedCable(): void {
    const id = this.selectedCableId();
    if (id) {
      this.openCableEdit(id);
    }
  }

  protected fitToElements(): void {
    if (!this.viewport.focusAll(this.elements().map((element) => element.position))) {
      this.notifications.warning('Nenhum elemento visível para enquadrar.');
    }
  }

  protected zoomIn(): void {
    this.geoMap().zoomIn();
  }

  protected zoomOut(): void {
    this.geoMap().zoomOut();
  }

  protected locate(): void {
    this.geoMap().locate();
  }

  // --- Traçado de cabo -----------------------------------------------------

  /** Acrescenta um vértice; guarda o elemento quando o clique encaixou numa OLT/caixa. */
  private appendPoint(position: GeoPoint, element?: MapElement): void {
    const points = this.cableDraftPoints();
    const last = points[points.length - 1];
    const snap: CableEndSuggestion | null =
      element && element.kind !== 'customer'
        ? { ref: { kind: element.kind, id: element.id }, name: element.name }
        : null;

    if (last && isSameVertex(last, position, this.view()?.zoom ?? null)) {
      // Mesmo ponto (ex.: os cliques do duplo clique, a poucos pixels): só completa o encaixe.
      if (snap) {
        this.cableDraftSnaps.update((snaps) => [...snaps.slice(0, -1), snap]);
      }
      return;
    }
    this.cableDraftPoints.set([...points, position]);
    this.cableDraftSnaps.update((snaps) => [...snaps, snap]);
    this.notifications.info(
      `${points.length + 1} vértice(s) no traçado. Duplo clique para finalizar; ESC cancela.`,
    );
  }

  private clearDraft(): void {
    this.cableDraftPoints.set([]);
    this.cableDraftSnaps.set([]);
  }

  /** Conclui o desenho: início = encaixe do 1º vértice; fim = encaixe do último. */
  private finishCable(): void {
    if (this.activeTool() !== 'addCable') {
      return;
    }
    const points = this.cableDraftPoints();
    if (points.length < 2) {
      this.notifications.warning('Clique ao menos em dois pontos para traçar o cabo.');
      return;
    }
    const snaps = this.cableDraftSnaps();
    this.openCableForm({
      mode: 'create',
      points,
      role: this.activeRole(),
      start: snaps[0] ?? undefined,
      end: snaps[snaps.length - 1] ?? undefined,
    });
  }

  // --- Camadas e filtros ---------------------------------------------------

  protected toggleLayerPanel(): void {
    this.showLayerPanel.update((visible) => !visible);
  }

  protected toggleLegend(): void {
    this.preferences.setShowLegend(!this.preferences.showLegend());
  }

  protected onBaseLayerChange(key: string): void {
    this.preferences.setBaseLayer(key);
  }

  protected onOpacityChange(opacity: number): void {
    this.preferences.setBaseLayerOpacity(opacity);
  }

  protected onLegendSearch(term: string): void {
    this.state.setSearch(term);
  }

  protected onLegendStatusChange(statuses: readonly InfrastructureStatus[]): void {
    this.state.setStatusFilter(statuses);
  }

  protected onLegendToggleGroup(group: LegendGroup): void {
    this.state.toggleGroup(group.key as LegendGroupKey);
  }

  protected onLegendSelectItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'element') {
      const element = this.findElement(leaf.id);
      if (element) {
        this.focusElement(element);
      }
      return;
    }
    const cable = this.repository.mapCables().find((item) => item.id === leaf.id);
    if (cable) {
      this.focusCable(cable);
    }
  }

  protected onLegendEditItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'element') {
      const element = this.findElement(leaf.id);
      if (element) {
        this.openElementEdit(element);
      }
      return;
    }
    this.openCableEdit(leaf.id);
  }

  protected onLegendRemoveItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'cable') {
      this.removeCable(leaf.id);
      return;
    }
    const element = this.findElement(leaf.id);
    if (element) {
      this.removeElement(element);
    }
  }

  private removeCable(id: string): void {
    const cable = this.repository.findCable(id);
    if (this.state.canEdit() && cable?.id) {
      this.confirmDelete('cabo', cable.name ?? '', this.repository.deleteCable(cable.id));
    }
  }

  /** Caixa e OLT; o cliente é excluído pela própria ficha. */
  private removeElement(element: MapElement): void {
    if (!this.state.canEdit()) {
      return;
    }
    if (element.kind === 'olt') {
      this.confirmDelete('OLT', element.name, this.repository.deleteOlt(element.id));
    } else if (element.kind === 'box') {
      this.confirmDelete('caixa', element.name, this.repository.deleteBox(element.id));
    }
  }

  protected clearFilters(): void {
    this.state.clearFilters();
  }

  // --- Diálogos ------------------------------------------------------------

  private openElementCreate(position: GeoPoint): void {
    const group = this.activeGroup();
    if (group === 'olt') {
      this.openOltForm({ mode: 'create', position });
    } else if (group === 'customer') {
      this.openCustomerForm({ mode: 'create', position });
    } else {
      this.openBoxForm({ mode: 'create', position, type: group as BoxType });
    }
  }

  private openElementEdit(element: MapElement, status?: CustomerStatus): void {
    if (!this.editable()) {
      return;
    }
    if (element.kind === 'customer') {
      const customer = this.repository.findCustomer(element.id);
      if (customer) {
        this.openCustomerForm({ mode: 'edit', customer, status });
      }
      return;
    }
    if (element.kind === 'olt') {
      const olt = this.repository.findOlt(element.id);
      if (olt) {
        this.openOltForm({ mode: 'edit', olt });
      }
      return;
    }
    const box = this.repository.findBox(element.id);
    if (box) {
      this.openBoxForm({ mode: 'edit', box });
    }
  }

  private openCableEdit(id: string): void {
    if (!this.editable()) {
      return;
    }
    const cable = this.repository.findCable(id);
    if (cable) {
      this.openCableForm({ mode: 'edit', cable });
    }
  }

  private openOltForm(data: OltFormData): void {
    this.openDialog(OltFormDialogComponent, data, '520px', (saved: { name?: string }) =>
      this.notifications.success(
        `OLT "${saved.name ?? ''}" ${data.mode === 'edit' ? 'atualizada' : 'cadastrada'}.`,
      ),
    );
  }

  private openBoxForm(data: BoxFormData): void {
    this.openDialog(BoxFormDialogComponent, data, '600px', (saved: { name?: string }) => {
      this.notifications.success(
        `Caixa "${saved.name ?? ''}" ${data.mode === 'edit' ? 'atualizada' : 'cadastrada'}.`,
      );
      // A ficha aberta da mesma caixa recarrega (ex.: o tipo mudou).
      if (data.mode === 'edit' && this.boxSheet.boxId() === data.box.id) {
        this.boxSheet.reload();
      }
    });
  }

  private openCustomerForm(data: CustomerFormData): void {
    this.openDialog(CustomerFormDialogComponent, data, '600px', (saved: { name?: string }) =>
      this.notifications.success(
        `Cliente "${saved.name ?? ''}" ${data.mode === 'edit' ? 'atualizado' : 'cadastrado'}.`,
      ),
    );
  }

  private openCableForm(data: CableFormData): void {
    this.openDialog(CableFormDialogComponent, data, '600px', (saved: { name?: string }) => {
      if (data.mode === 'create') {
        this.clearDraft();
      }
      this.notifications.success(
        `Cabo "${saved.name ?? ''}" ${data.mode === 'edit' ? 'atualizado' : 'cadastrado'}.`,
      );
    });
  }

  /** Abre um formulário (um por vez). Os diálogos salvam sozinhos e fecham com o resultado. */
  private openDialog<C, D, R>(
    component: ComponentType<C>,
    data: D,
    width: string,
    onSaved: (saved: R) => void,
  ): void {
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    this.dialog
      .open<C, D, R>(component, { data, width, maxWidth: '94vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          onSaved(saved);
        }
      });
  }

  private confirmDelete(label: string, name: string, request: Observable<void>): void {
    this.confirm({
      title: `Excluir ${label}`,
      message: `Tem certeza que deseja excluir "${name}"? A ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      request.subscribe({
        next: () => this.notifications.success(`"${name}" excluído.`),
        error: (error: unknown) => this.notifications.apiError(error),
      });
    });
  }

  private confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true));
  }
}

/** Altura (px) com que a gaveta da ficha abre no celular; 0 no computador (ficha ao lado). */
function sheetInset(): number {
  const mobile = typeof matchMedia === 'function' && matchMedia('(max-width: 899.98px)').matches;
  return mobile ? Math.round(window.innerHeight * SHEET_OPEN) : 0;
}

/** Balão do cabo selecionado: função, fibras, situação, detalhes e início/fim. */
function cablePopupHtml(cable: MapCable, extra: string | null, action: string | null): string {
  const role = roleDefinition(cable.role);
  return popupHtml({
    title: cable.name,
    badge: { code: role.code, color: role.color },
    typeText: `Cabo de ${role.label} · ${cable.fiberCapacity} fibras`,
    status: statusDefinition(cable.status),
    details: cable.details,
    extra,
    action,
  });
}
