import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { BASE_LAYERS, DEFAULT_MAP_VIEW } from '../../core/constants/map.constants';
import {
  CABLE_TYPES,
  Cable,
  CableType,
  cableColor,
  cableTypeDefinition,
  isCableType,
} from '../../core/models/cable.model';
import { GeoPath, GeoPoint, MapClickEvent, MapTool, MapViewState, PathVertexMoveEvent, PinMoveEvent } from '../../core/models/geo.model';
import {
  PIN_TYPES,
  Pin,
  PinStatus,
  PinType,
  isPinType,
  pinStatusDefinition,
  pinSubgroupKey,
  pinSubgroupLabel,
  pinTypeDefinition,
} from '../../core/models/pin.model';
import { CableStoreService } from '../../core/services/cable-store';
import { MapPreferencesService } from '../../core/services/map-preferences';
import { MapViewportService } from '../../core/services/map-viewport';
import { NotificationService } from '../../core/services/notification';
import { PinStoreService } from '../../core/services/pin-store';
import {
  CableFormDialogComponent,
  CableFormDialogData,
  CableFormResult,
} from '../../shared/cable/cable-form-dialog';
import { GeoMapComponent } from '../../shared/map/geo-map';
import {
  LegendGroup,
  LegendLeaf,
  LegendSection,
  LegendSubgroup,
  MapLegendComponent,
} from '../../shared/map/map-legend';
import { MapLayerPanelComponent } from '../../shared/map/map-layer-panel';
import { MapStatusBarComponent } from '../../shared/map/map-status-bar';
import { MapToolbarComponent } from '../../shared/map/map-toolbar';
import { MapTypePickerComponent, TypePickerOption } from '../../shared/map/map-type-picker';
import { PinFormDialogComponent, PinFormDialogData, PinFormResult } from '../../shared/pin/pin-form-dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { NetworkSidebarComponent } from './network-sidebar/network-sidebar';

/** Tela de desenho da rede: mapa + ferramentas + listas de PINs e cabos. */
@Component({
  selector: 'app-network-map-page',
  imports: [
    GeoMapComponent,
    MapLayerPanelComponent,
    MapLegendComponent,
    MapStatusBarComponent,
    MapToolbarComponent,
    MapTypePickerComponent,
    NetworkSidebarComponent,
  ],
  templateUrl: './network-map-page.html',
  styleUrl: './network-map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class NetworkMapPage {
  private readonly store = inject(PinStoreService);
  private readonly cableStore = inject(CableStoreService);
  private readonly preferences = inject(MapPreferencesService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly viewport = inject(MapViewportService);
  private readonly geoMap = viewChild.required(GeoMapComponent);

  protected readonly baseLayers = BASE_LAYERS;
  protected readonly preferencesState = this.preferences;

  protected readonly pins = this.store.visiblePins;
  protected readonly selectedId = this.store.selectedId;
  protected readonly search = this.store.search;
  protected readonly hasActiveFilters = computed(
    () => this.store.hasActiveFilters() || this.cableStore.hasActiveFilters(),
  );
  protected readonly totalPins = this.store.total;

  protected readonly cables = this.cableStore.visibleCables;
  protected readonly selectedCableId = this.cableStore.selectedId;
  protected readonly totalCables = this.cableStore.total;

  protected readonly activeTool = signal<MapTool>('select');
  /** Tipo usado pela ferramenta "Adicionar PIN". */
  protected readonly activePinType = signal<PinType>(PIN_TYPES[0].type);
  /** Tipo usado pela ferramenta "Traçar cabo". */
  protected readonly activeCableType = signal<CableType>(CABLE_TYPES[0].type);
  /** Vértices livremente lançados no traçado em construção. */
  protected readonly cableDraftPoints = signal<readonly GeoPoint[]>([]);

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
  protected readonly visibleCount = computed(() => this.pins().length);
  protected readonly activeStatuses = computed<readonly PinStatus[]>(() => [
    ...this.store.statusFilter(),
  ]);

  protected readonly isCreating = computed(
    () => this.activeTool() === 'addPin' || this.activeTool() === 'addCable',
  );
  protected readonly showPicker = computed(() => this.isCreating() && this.pickerVisible());

  /** Cor do elemento em criação — usada no PIN fantasma e na linha-guia. */
  protected readonly previewColor = computed<string | null>(() => {
    if (this.activeTool() === 'addPin') {
      return pinTypeDefinition(this.activePinType()).color;
    }
    if (this.activeTool() === 'addCable') {
      return cableTypeDefinition(this.activeCableType()).color;
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

  /** Cabos renderizados no mapa, incluindo a pré-visualização do traçado. */
  protected readonly paths = computed<readonly GeoPath[]>(() => {
    const result: GeoPath[] = [];

    for (const cable of this.cableStore.visibleCables()) {
      const definition = cableTypeDefinition(cable.type);
      if (cable.points.length < 2) {
        continue;
      }
      result.push({
        id: cable.id,
        points: cable.points,
        color: cableColor(cable),
        weight: definition.weight,
        dashArray: definition.dashArray,
      });
    }

    const draftPoints = this.cableDraftPoints();
    if (this.activeTool() === 'addCable' && draftPoints.length > 0) {
      const definition = cableTypeDefinition(this.activeCableType());
      result.push({
        id: '__draft__',
        points: [...draftPoints],
        color: definition.color,
        weight: definition.weight + 1,
        dashArray: '6 6',
      });
    }

    return result;
  });

  protected readonly pinTypeOptions = computed<readonly TypePickerOption[]>(() => {
    const counts = this.store.typeCounts();
    return PIN_TYPES.map((definition) => ({
      key: definition.type,
      label: definition.label,
      code: definition.code,
      color: definition.color,
      count: counts.get(definition.type) ?? 0,
    }));
  });

  protected readonly cableTypeOptions = computed<readonly TypePickerOption[]>(() => {
    const counts = this.cableStore.typeCounts();
    return CABLE_TYPES.map((definition) => ({
      key: definition.type,
      label: definition.label,
      code: definition.code,
      color: definition.color,
      count: counts.get(definition.type) ?? 0,
    }));
  });

  /**
   * Árvore da legenda: elementos e cabos agrupados por tipo e, quando o tipo
   * possui variantes (ex.: CTO 1x16 / 1x8), por subgrupo. Usa os itens que
   * passam por busca/situação para que a árvore sirva de listagem ao mesmo
   * tempo em que os "olhos" funcionam como filtro de visibilidade.
   */
  protected readonly legendSections = computed<readonly LegendSection[]>(() =>
    [this.legendPinSection(), this.legendCableSection()],
  );

  private readonly legendPinSection = computed<LegendSection>(() => {
    const pins = this.store.filteredPins();
    const hiddenTypes = this.store.hiddenTypes();
    const hiddenGroups = this.store.hiddenGroups();

    const groups: LegendGroup[] = [];
    for (const definition of PIN_TYPES) {
      const typePins = pins.filter((pin) => pin.type === definition.type);
      if (typePins.length === 0) {
        continue;
      }
      const typeHidden = hiddenTypes.has(definition.type);

      const buckets = new Map<string, { key: string; label: string; items: LegendLeaf[] }>();
      for (const pin of typePins) {
        const key = pinSubgroupKey(pin);
        if (key === null) {
          continue;
        }
        const bucket = buckets.get(key) ?? {
          key,
          label: pinSubgroupLabel(pin) ?? key,
          items: [],
        };
        bucket.items.push(toPinLeaf(pin));
        buckets.set(key, bucket);
      }

      const subgroups: LegendSubgroup[] = [...buckets.values()].map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        count: bucket.items.length,
        hidden: typeHidden || hiddenGroups.has(bucket.key),
        items: bucket.items,
      }));

      groups.push({
        key: definition.type,
        type: definition.type,
        kind: 'pin',
        label: definition.label,
        code: definition.code,
        color: definition.color,
        count: typePins.length,
        hidden: typeHidden,
        subgroups,
        items: subgroups.length > 0 ? [] : typePins.map(toPinLeaf),
      });
    }

    return { key: 'pins', label: 'Elementos', total: pins.length, groups };
  });

  private readonly legendCableSection = computed<LegendSection>(() => {
    const cables = this.cableStore.filteredCables();
    const hiddenTypes = this.cableStore.hiddenTypes();

    const groups: LegendGroup[] = [];
    for (const definition of CABLE_TYPES) {
      const typeCables = cables.filter((cable) => cable.type === definition.type);
      if (typeCables.length === 0) {
        continue;
      }
      groups.push({
        key: definition.type,
        type: definition.type,
        kind: 'cable',
        label: definition.label,
        code: definition.code,
        color: definition.color,
        count: typeCables.length,
        hidden: hiddenTypes.has(definition.type),
        dashed: Boolean(definition.dashArray),
        subgroups: [],
        items: typeCables.map(toCableLeaf),
      });
    }

    return { key: 'cables', label: 'Cabos', total: cables.length, groups };
  });

  // --- Ferramentas ---------------------------------------------------------

  protected setTool(tool: MapTool): void {
    this.cableDraftPoints.set([]);
    this.activeTool.set(tool);
    this.pickerVisible.set(true);

    if (tool === 'addPin') {
      this.notifications.info(
        `Tipo "${pinTypeDefinition(this.activePinType()).label}": clique no mapa para criar. ESC encerra.`,
      );
    } else if (tool === 'addCable') {
      this.notifications.info(
        'Clique no mapa para traçar o cabo (ímã aproxima dos PINs). Duplo clique finaliza; ESC cancela.',
      );
    } else if (tool === 'move') {
      this.notifications.info('Arraste um PIN para corrigir a posição.');
    } else if (tool === 'editCable') {
      this.notifications.info('Arraste os vértices do cabo selecionado. ESC encerra.');
    }
  }

  /** Sai da ferramenta de criação (ou do arrasto) — atalho pedido: `ESC`. */
  onEscape(): void {
    // Um diálogo aberto já trata o ESC por conta própria (fechá-lo).
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    const tool = this.activeTool();
    if (tool !== 'select') {
      this.cableDraftPoints.set([]);
      this.activeTool.set('select');
      this.notifications.info('Ferramenta encerrada.');
    }
  }

  protected closePicker(): void {
    this.pickerVisible.set(false);
  }

  protected onPinTypePicked(key: string): void {
    if (!isPinType(key)) {
      return;
    }
    this.activePinType.set(key);
    this.notifications.info(`${pinTypeDefinition(key).label} selecionado. Clique no mapa para criar.`);
  }

  protected onCableTypePicked(key: string): void {
    if (!isCableType(key)) {
      return;
    }
    this.activeCableType.set(key);
    this.notifications.info(`Cabo ${cableTypeDefinition(key).label} selecionado.`);
  }

  // --- Eventos do mapa -----------------------------------------------------

  protected onMapClick(event: MapClickEvent): void {
    if (event.tool === 'addPin') {
      this.openPinForm({
        mode: 'create',
        position: event.position,
        type: this.activePinType(),
      });
      return;
    }
    if (event.tool === 'addCable') {
      this.appendPoint(event.position);
      return;
    }
    // Nas ferramentas de mover/editar, o clique no vazio não altera a seleção.
    if (event.tool === 'move' || event.tool === 'editCable') {
      return;
    }
    this.store.select(null);
    this.cableStore.select(null);
  }

  /** Clique no PIN: cria um vértice (traçado) ou abre a edição do elemento. */
  protected onPinClick(pin: Pin): void {
    const tool = this.activeTool();
    if (tool === 'addCable') {
      this.appendPoint(pin.position);
      return;
    }
    if (tool === 'move' || tool === 'editCable') {
      return;
    }
    this.store.select(pin.id);
    this.cableStore.select(null);
    this.openPinForm({ mode: 'edit', pin });
  }

  /** Duplo clique em um PIN conclui o traçado em construção. */
  protected onPinDoubleClick(): void {
    this.finishCable();
  }

  /** Duplo clique no mapa também conclui o traçado. */
  protected onMapDoubleClick(): void {
    this.finishCable();
  }

  /** Clique no cabo: abre a edição do elemento (apenas na ferramenta selecionar). */
  protected onPathClick(path: GeoPath): void {
    if (this.activeTool() !== 'select') {
      return;
    }
    const cable = this.cableStore.findById(path.id);
    if (!cable) {
      return;
    }
    this.cableStore.select(cable.id);
    this.store.select(null);
    this.openCableForm({ mode: 'edit', cable });
  }

  /** Um vértice do cabo foi arrastado no mapa (ferramenta "Mover cabo"). */
  protected onPathVertexMoved(event: PathVertexMoveEvent): void {
    const cable = this.cableStore.findById(event.pathId);
    if (!cable) {
      return;
    }
    const points = cable.points.map((point, index) =>
      index === event.index ? event.position : point,
    );
    this.cableStore.update(event.pathId, { points });
  }

  protected onPinMoved(event: PinMoveEvent): void {
    const pin = this.store.findById(event.pinId);
    if (!pin) {
      return;
    }
    this.store.moveTo(event.pinId, event.position);
    this.notifications.success(`Posição de "${pin.name}" atualizada.`);
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

  // --- Criação dinâmica de PIN ---------------------------------------------

  protected editPin(pin: Pin): void {
    this.openPinForm({ mode: 'edit', pin });
  }

  protected removePin(pin: Pin): void {
    this.confirm({
      title: 'Remover PIN',
      message: `Tem certeza que deseja remover "${pin.name}" do projeto?`,
      confirmLabel: 'Remover',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.remove(pin.id);
      this.notifications.success(`PIN "${pin.name}" removido.`);
    });
  }

  protected clearAll(): void {
    this.confirm({
      title: 'Remover tudo',
      message: `Isso apagará ${this.totalPins()} PIN(s) e ${this.totalCables()} cabo(s). A ação não pode ser desfeita.`,
      confirmLabel: 'Remover todos',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.clearAll();
      this.cableStore.clearAll();
      this.cableDraftPoints.set([]);
      this.notifications.success('PINs e cabos foram removidos.');
    });
  }

  /** Seleciona e centraliza o PIN escolhido na legenda/lista. */
  protected zoomToPin(pin: Pin): void {
    this.viewport.focus(pin.position);
    this.store.select(pin.id);
    this.cableStore.select(null);
  }

  // --- Traçado de cabo -----------------------------------------------------

  /** Acrescenta um vértice livre ao traçado em construção. */
  private appendPoint(position: GeoPoint): void {
    const points = this.cableDraftPoints();
    const last = points[points.length - 1];
    if (last && last.lat === position.lat && last.lng === position.lng) {
      return;
    }
    this.cableDraftPoints.set([...points, position]);
    this.notifications.info(
      `${points.length + 1} vértice(s) no traçado. Duplo clique para finalizar; ESC cancela.`,
    );
  }

  /** Conclui o desenho abrindo o formulário de dados do cabo. */
  private finishCable(): void {
    if (this.activeTool() !== 'addCable') {
      return;
    }
    const points = this.cableDraftPoints();
    if (points.length < 2) {
      this.notifications.warning('Clique ao menos em dois pontos para traçar o cabo.');
      return;
    }
    this.openCableForm({
      mode: 'create',
      points,
      type: this.activeCableType(),
    });
  }

  protected editCable(cable: Cable): void {
    this.openCableForm({ mode: 'edit', cable });
  }

  /** Seleciona e enquadra o cabo escolhido na legenda/lista. */
  protected zoomToCable(cable: Cable): void {
    if (!this.viewport.focusAll(cable.points)) {
      this.notifications.warning('Não foi possível enquadrar o cabo.');
      return;
    }
    this.cableStore.select(cable.id);
    this.store.select(null);
  }

  protected removeCable(cable: Cable): void {
    this.confirm({
      title: 'Remover cabo',
      message: `Tem certeza que deseja remover "${cable.name}" do projeto?`,
      confirmLabel: 'Remover',
      danger: true,
    }).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.cableStore.remove(cable.id);
      this.notifications.success(`Cabo "${cable.name}" removido.`);
    });
  }

  // --- Navegação -----------------------------------------------------------

  protected fitToPins(): void {
    if (!this.viewport.focusAll(this.pins().map((pin) => pin.position))) {
      this.notifications.warning('Nenhum PIN visível para enquadrar.');
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

  /** Busca da legenda: aplica o mesmo termo a elementos e cabos. */
  protected onLegendSearch(term: string): void {
    this.store.setSearch(term);
    this.cableStore.setSearch(term);
  }

  /** Filtro de situação da legenda: vale para elementos e cabos. */
  protected onLegendStatusChange(statuses: readonly PinStatus[]): void {
    this.store.setStatusFilter(statuses);
    this.cableStore.setStatusFilter(statuses);
  }

  /** "Olho" de um grupo: oculta/mostra o tipo inteiro no mapa e na árvore. */
  protected onLegendToggleGroup(group: LegendGroup): void {
    if (group.kind === 'pin' && isPinType(group.type)) {
      this.store.toggleTypeVisibility(group.type);
      return;
    }
    if (group.kind === 'cable' && isCableType(group.type)) {
      this.cableStore.toggleTypeVisibility(group.type);
    }
  }

  /** "Olho" de um subgrupo (ex.: CTO 1x8). */
  protected onLegendToggleSubgroup(subgroup: LegendSubgroup): void {
    this.store.toggleGroupVisibility(subgroup.key);
  }

  /** Clique em um item da árvore: seleciona e centraliza no mapa. */
  protected onLegendSelectItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'pin') {
      const pin = this.store.findById(leaf.id);
      if (pin) {
        this.zoomToPin(pin);
      }
      return;
    }
    const cable = this.cableStore.findById(leaf.id);
    if (cable) {
      this.zoomToCable(cable);
    }
  }

  /** Abre o diálogo de edição do item escolhido na árvore. */
  protected onLegendEditItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'pin') {
      const pin = this.store.findById(leaf.id);
      if (pin) {
        this.editPin(pin);
      }
      return;
    }
    const cable = this.cableStore.findById(leaf.id);
    if (cable) {
      this.editCable(cable);
    }
  }

  /** Remove o item escolhido na árvore (com confirmação). */
  protected onLegendRemoveItem(leaf: LegendLeaf): void {
    if (leaf.kind === 'pin') {
      const pin = this.store.findById(leaf.id);
      if (pin) {
        this.removePin(pin);
      }
      return;
    }
    const cable = this.cableStore.findById(leaf.id);
    if (cable) {
      this.removeCable(cable);
    }
  }

  protected clearFilters(): void {
    this.store.resetFilters();
    this.cableStore.resetFilters();
  }

  // --- Diálogos ------------------------------------------------------------

  private openPinForm(data: PinFormDialogData): void {
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    this.dialog
      .open<PinFormDialogComponent, PinFormDialogData, PinFormResult>(PinFormDialogComponent, {
        data,
        width: '600px',
        maxWidth: '94vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result === 'move') {
          if (data.pin) {
            this.movePinOnMap(data.pin);
          }
          return;
        }
        if (data.mode === 'edit' && data.pin) {
          this.store.update(data.pin.id, result);
          this.notifications.success(`PIN "${result.name}" atualizado.`);
          return;
        }
        this.store.add(result);
        this.notifications.success(`PIN "${result.name}" criado.`);
      });
  }

  private openCableForm(data: CableFormDialogData): void {
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    this.dialog
      .open<CableFormDialogComponent, CableFormDialogData, CableFormResult>(CableFormDialogComponent, {
        data,
        width: '560px',
        maxWidth: '94vw',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result === 'move') {
          if (data.cable) {
            this.editCableVertices(data.cable);
          }
          return;
        }
        if (data.mode === 'edit' && data.cable) {
          this.cableStore.update(data.cable.id, result);
          this.notifications.success(`Cabo "${result.name}" atualizado.`);
          return;
        }
        const cable = this.cableStore.add(result);
        this.cableDraftPoints.set([]);
        this.notifications.success(
          `Cabo "${cable.name}" criado com ${result.points.length} vértices.`,
        );
      });
  }

  /** Fecha o diálogo do PIN e entra no arrasto do marcador. */
  private movePinOnMap(pin: Pin): void {
    this.cableDraftPoints.set([]);
    this.store.select(pin.id);
    this.cableStore.select(null);
    this.activeTool.set('move');
    this.notifications.info(`Arraste "${pin.name}" para a nova posição. ESC encerra.`);
  }

  /** Fecha o diálogo do cabo e habilita o arrasto dos vértices. */
  private editCableVertices(cable: Cable): void {
    this.cableDraftPoints.set([]);
    this.cableStore.select(cable.id);
    this.store.select(null);
    this.activeTool.set('editCable');
    this.notifications.info(`Arraste os vértices de "${cable.name}". ESC encerra.`);
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

/** Converte um PIN em uma folha da árvore da legenda. */
function toPinLeaf(pin: Pin): LegendLeaf {
  const status = pinStatusDefinition(pin.status);
  return {
    id: pin.id,
    kind: 'pin',
    label: pin.name,
    statusColor: status.color,
    statusLabel: status.label,
  };
}

/** Converte um cabo em uma folha da árvore da legenda. */
function toCableLeaf(cable: Cable): LegendLeaf {
  const status = pinStatusDefinition(cable.status);
  return {
    id: cable.id,
    kind: 'cable',
    label: cable.name,
    statusColor: status.color,
    statusLabel: status.label,
  };
}
