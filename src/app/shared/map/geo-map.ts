import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import {
  DEFAULT_BASE_LAYER_KEY,
  DEFAULT_MAP_VIEW,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  baseLayerDefinition,
} from '../../core/constants/map.constants';
import 'leaflet.markercluster';
import {
  ElementMoveEvent,
  GeoPath,
  GeoPoint,
  MapClickEvent,
  MapTool,
  MapViewState,
  PathVertexMoveEvent,
} from '../../core/models/geo.model';
import { MapElement } from '../../core/network/map-element';
import { MapViewportService } from '../../core/services/map-viewport';
import { NotificationService } from '../../core/services/notification';
import {
  createElementIcon,
  createGhostIcon,
  createUserLocationIcon,
  elementPopupHtml,
  elementTooltipHtml,
} from './pin-marker';
import { bindElementMarker, canDragMarker, elementChanged, pathClickIntent } from './marker-sync';

/** Distância (px) dentro da qual um clique no mapa "gruda" em um elemento. */
const SNAP_DISTANCE_PX = 15;

/**
 * Mapa Leaflet reutilizável.
 *
 * O componente cuida apenas da interação geográfica (camadas, pan/zoom,
 * marcadores, ferramentas e eventos) e não conhece as regras de negócio:
 * o estado entra por `input`s e as intenções do usuário saem por `output`s.
 * Ações imperativas (centralizar, enquadrar, localizar) ficam expostas por
 * métodos públicos para uso via `viewChild`.
 */
@Component({
  selector: 'app-geo-map',
  templateUrl: './geo-map.html',
  styleUrl: './geo-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoMapComponent implements OnDestroy {
  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private readonly notifications = inject(NotificationService);
  private readonly viewport = inject(MapViewportService);

  /** Visão inicial — aplicada apenas na criação do mapa. */
  readonly initialCenter = input<GeoPoint>(DEFAULT_MAP_VIEW.center);
  readonly initialZoom = input<number>(DEFAULT_MAP_VIEW.zoom);
  readonly minZoom = input<number>(MAP_MIN_ZOOM);
  readonly maxZoom = input<number>(MAP_MAX_ZOOM);

  /** Elementos (OLTs, caixas, clientes) a exibir. */
  readonly elements = input<readonly MapElement[]>([]);
  /** Elemento destacado (`MapElement.key`). */
  readonly selectedElementKey = input<string | null>(null);
  /** Elementos com anel de destaque (ex.: os do cabo aberto na ficha), por `MapElement.key`. */
  readonly highlightedKeys = input<ReadonlySet<string>>(new Set());
  /** Libera o arrasto de elementos e vértices (permissão de edição). */
  readonly editable = input(true);
  /** Ferramenta ativa, define o cursor e o arrasto dos marcadores. */
  readonly activeTool = input<MapTool>('select');
  /** Chave da camada base (ver `BASE_LAYERS`). */
  readonly baseLayerKey = input<string>(DEFAULT_BASE_LAYER_KEY);
  /** Opacidade da camada base (0.2 a 1). */
  readonly baseLayerOpacity = input<number>(1);

  /** Cabos (polilinhas) a exibir sobre o mapa. */
  readonly paths = input<readonly GeoPath[]>([]);
  /** Cabo destacado. */
  readonly selectedPathId = input<string | null>(null);
  /** Âncora do traçado em construção: liga o último vértice ao cursor. */
  readonly draftOrigin = input<GeoPoint | null>(null);
  /** Cor do elemento em criação (usada no marcador fantasma e na linha-guia). */
  readonly previewColor = input<string | null>(null);

  /** Instância do mapa, para consumidores avançados. */
  readonly mapReady = output<L.Map>();
  /** Clique no mapa. */
  readonly mapClick = output<MapClickEvent>();
  /** Clique em um elemento. */
  readonly elementClick = output<MapElement>();
  /** Elemento arrastado para uma nova posição. */
  readonly elementMoved = output<ElementMoveEvent>();
  /** Posição do cursor (`null` quando sai do mapa). */
  readonly pointerMove = output<GeoPoint | null>();
  /** Mudança de centro/zoom. */
  readonly viewChanged = output<MapViewState>();
  /** Localização do usuário obtida com sucesso. */
  readonly located = output<GeoPoint>();
  /** Clique em um cabo. */
  readonly pathClick = output<GeoPath>();
  /** Duplo clique em um elemento (conclui o traçado de cabo). */
  readonly elementDoubleClick = output<MapElement>();
  /** Duplo clique no mapa (conclui o traçado de cabo). */
  readonly mapDoubleClick = output<GeoPoint>();
  /** Vértice de um cabo arrastado (ferramenta "Editar cabo"). */
  readonly pathVertexMoved = output<PathVertexMoveEvent>();

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private ghostMarker: L.Marker | null = null;
  private userMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;
  private rubberBand: L.Polyline | null = null;
  private snapMarker: L.CircleMarker | null = null;
  private popup: L.Popup | null = null;
  private cursorPoint: GeoPoint | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Marcadores por `MapElement.key`. */
  private readonly markers = new Map<string, L.Marker>();
  /** Último elemento desenhado em cada marcador (evita redesenhar o que não mudou). */
  private readonly markerElements = new Map<string, MapElement>();
  /** Seleção já aplicada aos ícones. */
  private appliedSelection: string | null = null;
  /** Destaque já aplicado aos ícones. */
  private appliedHighlight: ReadonlySet<string> = new Set();
  /** Grupos agrupadores: infraestrutura (OLT/caixas) e clientes. */
  private infraCluster: L.MarkerClusterGroup | null = null;
  private customerCluster: L.MarkerClusterGroup | null = null;
  /** Renderizador canvas compartilhado pelas linhas dos cabos. */
  private readonly cableRenderer = L.canvas({ tolerance: 6 });
  private readonly pathLines = new Map<string, L.Polyline>();
  private readonly vertexMarkers: L.Marker[] = [];

  constructor() {
    afterNextRender(() => this.createMap());

    effect(() => {
      const elements = this.elements();
      if (this.map) {
        untracked(() => this.syncMarkers(elements));
      }
    });

    effect(() => {
      const selectedKey = this.selectedElementKey();
      if (this.map) {
        untracked(() => this.syncSelection(selectedKey));
      }
    });

    effect(() => {
      const highlighted = this.highlightedKeys();
      if (this.map) {
        untracked(() => this.syncHighlight(highlighted));
      }
    });

    effect(() => {
      const tool = this.activeTool();
      this.editable();
      if (this.map) {
        this.applyTool(tool);
      }
    });

    effect(() => {
      const key = this.baseLayerKey();
      const opacity = this.baseLayerOpacity();
      if (this.map) {
        this.applyBaseLayer(key, opacity);
      }
    });

    effect(() => {
      const paths = this.paths();
      const selectedPathId = this.selectedPathId();
      const tool = this.activeTool();
      if (this.map) {
        this.syncPaths(paths, selectedPathId);
        this.syncVertexHandles(paths, selectedPathId, tool);
      }
    });

    // Balão do elemento selecionado: reage à seleção e aos dados do elemento.
    effect(() => {
      const elementKey = this.selectedElementKey();
      const pathId = this.selectedPathId();
      const elements = this.elements();
      const paths = this.paths();
      this.editable();
      if (this.map) {
        this.refreshPopup(elementKey, pathId, elements, paths);
      }
    });

    effect(() => {
      const tool = this.activeTool();
      const origin = this.draftOrigin();
      const color = this.previewColor();
      if (this.map) {
        this.applyRubberBand(tool, origin, color);
      }
    });

    effect(() => {
      const color = this.previewColor();
      if (this.ghostMarker) {
        this.ghostMarker.setIcon(createGhostIcon(color ?? undefined));
      }
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.popup = null;
    this.viewport.register(null);
    this.markers.clear();
    this.markerElements.clear();
    this.infraCluster = null;
    this.customerCluster = null;
    this.pathLines.clear();
    this.vertexMarkers.length = 0;
    this.rubberBand = null;
    this.snapMarker = null;
  }

  // --- API pública ---------------------------------------------------------

  getMap(): L.Map | null {
    return this.map;
  }

  /** Centro atual do mapa, usado por exemplo para posicionar um novo elemento. */
  getCenter(): GeoPoint | null {
    const center = this.map?.getCenter();
    return center ? { lat: center.lat, lng: center.lng } : null;
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  /** Centraliza na posição do usuário usando a Geolocation API. */
  locate(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.notifications.warning('Geolocalização não é suportada neste navegador.');
      return;
    }

    this.notifications.info('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const position: GeoPoint = { lat: result.coords.latitude, lng: result.coords.longitude };
        this.showUserLocation(position, result.coords.accuracy);
        map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
        this.located.emit(position);
      },
      () => this.notifications.error('Não foi possível obter sua localização.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // --- Inicialização -------------------------------------------------------

  private createMap(): void {
    if (this.map) {
      return;
    }

    const container = this.mapHost().nativeElement;
    const map = L.map(container, {
      center: [this.initialCenter().lat, this.initialCenter().lng],
      zoom: this.initialZoom(),
      minZoom: this.minZoom(),
      maxZoom: this.maxZoom(),
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
    });
    this.map = map;

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    this.applyBaseLayer(this.baseLayerKey(), this.baseLayerOpacity());
    const clusterOptions: L.MarkerClusterGroupOptions = {
      disableClusteringAtZoom: 17,
      showCoverageOnHover: false,
      chunkedLoading: true,
    };
    this.infraCluster = L.markerClusterGroup(clusterOptions).addTo(map);
    this.customerCluster = L.markerClusterGroup(clusterOptions).addTo(map);
    this.syncMarkers(this.elements());
    this.applyTool(this.activeTool());
    this.syncPaths(this.paths(), this.selectedPathId());

    map.on('click', (event: L.LeafletMouseEvent) => this.emitMapClick(event.latlng));

    map.on('dblclick', (event: L.LeafletMouseEvent) => {
      this.mapDoubleClick.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      const position: GeoPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
      const tool = this.activeTool();
      if (tool === 'addElement') {
        this.updateGhost(position);
      } else if (tool === 'addCable') {
        const snapped = this.snapToElement(position)?.position ?? null;
        this.cursorPoint = snapped ?? position;
        this.updateSnapIndicator(snapped);
        this.applyRubberBand(tool, this.draftOrigin(), this.previewColor());
      }
      this.pointerMove.emit(position);
    });

    map.on('mouseout', () => {
      this.cursorPoint = null;
      this.removeGhost();
      this.updateSnapIndicator(null);
      this.applyRubberBand(this.activeTool(), null, this.previewColor());
      this.pointerMove.emit(null);
    });

    map.on('moveend zoomend', () => this.emitView());

    this.observeResize(container);
    this.viewport.register(map);
    this.mapReady.emit(map);
    this.emitView();
  }

  /** Clique no mapa (ou numa linha, nas ferramentas de criação), com o ímã do traçado. */
  private emitMapClick(latlng: L.LatLng): void {
    const tool = this.activeTool();
    const raw: GeoPoint = { lat: latlng.lat, lng: latlng.lng };
    // No traçado de cabo o clique "gruda" em um elemento próximo (ímã).
    const snapped = tool === 'addCable' ? this.snapToElement(raw) : null;
    this.mapClick.emit(
      snapped ? { position: snapped.position, tool, snappedKey: snapped.key } : { position: raw, tool },
    );
  }

  /** Mantém o mapa íntegro quando o container muda de tamanho (sidenav, janela). */
  private observeResize(container: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ animate: false }));
    this.resizeObserver.observe(container);
  }

  private emitView(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const center = map.getCenter();
    this.viewChanged.emit({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() });
  }

  // --- Camada base ---------------------------------------------------------

  private applyBaseLayer(key: string, opacity: number): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const definition = baseLayerDefinition(key);
    this.tileLayer?.remove();

    this.tileLayer = L.tileLayer(definition.url, {
      attribution: definition.attribution,
      maxZoom: definition.maxZoom,
      opacity,
      crossOrigin: true,
    }).addTo(map);
    this.tileLayer.bringToBack();
  }

  // --- Marcadores ----------------------------------------------------------

  private clusterFor(key: string): L.MarkerClusterGroup | null {
    return key.startsWith('customer:') ? this.customerCluster : this.infraCluster;
  }

  /** Atualiza os marcadores de forma incremental (por `MapElement.key`). */
  private syncMarkers(elements: readonly MapElement[]): void {
    if (!this.map) {
      return;
    }

    const incoming = new Set(elements.map((element) => element.key));
    for (const [key, marker] of this.markers) {
      if (!incoming.has(key)) {
        this.clusterFor(key)?.removeLayer(marker);
        this.markers.delete(key);
        this.markerElements.delete(key);
      }
    }

    const added = new Map<L.MarkerClusterGroup, L.Marker[]>();
    for (const element of elements) {
      const existing = this.markers.get(element.key);
      const previous = this.markerElements.get(element.key);
      this.markerElements.set(element.key, element);
      if (existing) {
        // Só mexe no marcador quando algo visível mudou: no agrupador, cada
        // `setLatLng` remove e recoloca o marcador.
        if (elementChanged(previous, element)) {
          const position = existing.getLatLng();
          if (position.lat !== element.position.lat || position.lng !== element.position.lng) {
            existing.setLatLng([element.position.lat, element.position.lng]);
          }
          existing.setIcon(this.iconFor(element));
          existing.setTooltipContent(elementTooltipHtml(element));
          this.applyMarkerDraggable(element.key, existing);
        }
        continue;
      }

      const marker = this.createMarker(element);
      this.markers.set(element.key, marker);
      this.applyMarkerDraggable(element.key, marker);
      const cluster = this.clusterFor(element.key);
      if (cluster) {
        added.set(cluster, [...(added.get(cluster) ?? []), marker]);
      }
    }
    for (const [cluster, markers] of added) {
      cluster.addLayers(markers);
    }
  }

  private createMarker(element: MapElement): L.Marker {
    const marker = L.marker([element.position.lat, element.position.lng], {
      icon: this.iconFor(element),
      // O Leaflet recria o arrasto a cada inclusão no mapa a partir desta opção,
      // por isso ela acompanha a ferramenta (ver `applyMarkerDraggable`).
      draggable: false,
      autoPan: true,
      riseOnHover: true,
      keyboard: false,
      title: element.name,
      zIndexOffset: this.selectedElementKey() === element.key ? 1000 : 0,
    });

    marker.bindTooltip(elementTooltipHtml(element), {
      direction: 'top',
      offset: L.point(0, -8),
      opacity: 0.95,
      className: 'gf-pin-tooltip',
    });

    bindElementMarker(marker, () => this.markerElements.get(element.key) ?? element, {
      click: (current) => this.elementClick.emit(current),
      dblclick: (current) => this.elementDoubleClick.emit(current),
      dragend: (current, dragged) => {
        const position = dragged.getLatLng();
        dragged.setIcon(this.iconFor(current));
        this.elementMoved.emit({
          key: current.key,
          position: { lat: position.lat, lng: position.lng },
        });
      },
    });
    return marker;
  }

  /** Arrasto só na ferramenta "Mover", com permissão de edição e nunca em clientes. */
  private applyMarkerDraggable(key: string, marker: L.Marker): void {
    const allowed = canDragMarker(this.activeTool(), this.editable(), key);
    // A opção vale quando o agrupador recoloca o marcador; o handler, para o atual.
    marker.options.draggable = allowed;
    if (allowed) {
      marker.dragging?.enable();
    } else {
      marker.dragging?.disable();
    }
  }

  /** Ícone do elemento com a seleção e o destaque atuais. */
  private iconFor(element: MapElement): L.DivIcon {
    return createElementIcon(
      element,
      this.selectedElementKey() === element.key,
      this.highlightedKeys().has(element.key),
    );
  }

  /** Troca o ícone só dos elementos que entraram ou saíram do destaque. */
  private syncHighlight(next: ReadonlySet<string>): void {
    const previous = this.appliedHighlight;
    this.appliedHighlight = next;
    for (const key of new Set([...previous, ...next])) {
      if (previous.has(key) === next.has(key)) continue;
      const marker = this.markers.get(key);
      const element = this.markerElements.get(key);
      if (marker && element) marker.setIcon(this.iconFor(element));
    }
  }

  /**
   * Troca o ícone só do antigo e do novo selecionado. O destaque fica no próprio ícone
   * (e não numa classe no DOM), para sobreviver quando o agrupador recria o marcador.
   */
  private syncSelection(selectedKey: string | null): void {
    const previousKey = this.appliedSelection;
    this.appliedSelection = selectedKey;
    for (const key of new Set([previousKey, selectedKey])) {
      const marker = key ? this.markers.get(key) : undefined;
      const element = key ? this.markerElements.get(key) : undefined;
      if (!marker || !element) {
        continue;
      }
      marker.setIcon(this.iconFor(element));
      marker.setZIndexOffset(key === selectedKey ? 1000 : 0);
    }
  }

  // --- Balão de informações do elemento selecionado ------------------------

  /**
   * Mostra o balão do elemento atualmente selecionado (elemento tem prioridade sobre
   * o cabo) e o fecha quando não há seleção. A seleção em si é decidida pela
   * página: o primeiro clique seleciona; o segundo abre a edição.
   */
  private refreshPopup(
    elementKey: string | null,
    pathId: string | null,
    elements: readonly MapElement[],
    paths: readonly GeoPath[],
  ): void {
    const element = elementKey ? elements.find((item) => item.key === elementKey) : undefined;
    if (element) {
      const canEditIt = this.editable() && element.kind !== 'customer';
      this.showPopup(
        [element.position.lat, element.position.lng],
        elementPopupHtml(element, null, canEditIt ? 'Clique novamente para editar' : null),
        -34,
      );
      return;
    }

    const line = pathId ? this.pathLines.get(pathId) : undefined;
    const path = pathId ? paths.find((item) => item.id === pathId) : undefined;
    if (line && path?.popupHtml) {
      const center = line.getCenter();
      this.showPopup([center.lat, center.lng], path.popupHtml, -14);
      return;
    }

    this.hidePopup();
  }

  private showPopup(latlng: L.LatLngExpression, content: string, offsetY: number): void {
    const map = this.map;
    if (!map) {
      return;
    }

    if (!this.popup) {
      // Popup próprio: o Leaflet não o fecha ao clicar e não o alterna no
      // segundo clique — quem controla isso é a seleção da página.
      this.popup = L.popup({
        className: 'gf-popup-wrapper',
        closeButton: false,
        closeOnClick: false,
        autoPan: false,
        minWidth: 168,
        maxWidth: 260,
      });
    }

    this.popup.options.offset = L.point(0, offsetY);
    this.popup.setLatLng(latlng).setContent(content);
    if (!map.hasLayer(this.popup)) {
      this.popup.openOn(map);
    }
  }

  private hidePopup(): void {
    const map = this.map;
    if (map && this.popup && map.hasLayer(this.popup)) {
      map.closePopup(this.popup);
    }
  }

  private applyTool(tool: MapTool): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const container = map.getContainer();
    container.classList.toggle('gf-map--add-pin', tool === 'addElement');
    container.classList.toggle('gf-map--add-cable', tool === 'addCable');
    container.classList.toggle('gf-map--move-pin', tool === 'move');
    container.classList.toggle('gf-map--edit-cable', tool === 'editCable');

    // O duplo clique finaliza o traçado, portanto não pode dar zoom.
    if (tool === 'addCable') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    for (const [key, marker] of this.markers) {
      this.applyMarkerDraggable(key, marker);
    }

    if (tool !== 'addElement') {
      this.removeGhost();
    }
    if (tool !== 'addCable') {
      this.updateSnapIndicator(null);
    }
  }

  /** Elemento mais próximo dentro do raio do ímã, ou `null`. */
  private snapToElement(position: GeoPoint): MapElement | null {
    const map = this.map;
    if (!map) {
      return null;
    }
    const point = map.latLngToContainerPoint([position.lat, position.lng]);
    let best: MapElement | null = null;
    let bestDistance = SNAP_DISTANCE_PX;

    for (const element of this.elements()) {
      const target = map.latLngToContainerPoint([element.position.lat, element.position.lng]);
      const distance = point.distanceTo(target);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = element;
      }
    }

    return best;
  }

  /** Realça visualmente o ponto magnético sob o cursor. */
  private updateSnapIndicator(position: GeoPoint | null): void {
    const map = this.map;
    if (!map || !position) {
      this.snapMarker?.remove();
      this.snapMarker = null;
      return;
    }

    if (!this.snapMarker) {
      this.snapMarker = L.circleMarker([position.lat, position.lng], {
        radius: 9,
        color: '#1e88e5',
        weight: 2,
        fillColor: '#1e88e5',
        fillOpacity: 0.25,
        interactive: false,
      }).addTo(map);
      return;
    }

    this.snapMarker.setLatLng([position.lat, position.lng]);
  }

  // --- Pré-visualização do novo elemento ----------------------------------

  private updateGhost(position: GeoPoint): void {
    const map = this.map;
    if (!map) {
      return;
    }
    if (!this.ghostMarker) {
      this.ghostMarker = L.marker([position.lat, position.lng], {
        icon: createGhostIcon(this.previewColor() ?? undefined),
        interactive: false,
        keyboard: false,
        zIndexOffset: 500,
      }).addTo(map);
      return;
    }
    this.ghostMarker.setLatLng([position.lat, position.lng]);
  }

  private removeGhost(): void {
    this.ghostMarker?.remove();
    this.ghostMarker = null;
  }

  // --- Cabos (polilinhas) --------------------------------------------------

  private syncPaths(paths: readonly GeoPath[], selectedPathId: string | null): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const incoming = new Set(paths.map((path) => path.id));
    for (const [id, line] of this.pathLines) {
      if (!incoming.has(id)) {
        line.remove();
        this.pathLines.delete(id);
      }
    }

    for (const path of paths) {
      const selected = path.id === selectedPathId;
      const latlngs = path.points.map((point) => L.latLng(point.lat, point.lng));
      const style: L.PolylineOptions = {
        color: path.color,
        weight: selected ? path.weight + 3 : path.weight,
        dashArray: path.dashArray,
        opacity: selected ? 1 : (path.opacity ?? 0.9),
        lineCap: 'round',
        lineJoin: 'round',
      };

      const existing = this.pathLines.get(path.id);
      if (existing) {
        existing.setLatLngs(latlngs);
        existing.setStyle(style);
        continue;
      }

      const line = L.polyline(latlngs, {
        ...style,
        bubblingMouseEvents: false,
        renderer: this.cableRenderer,
      });
      // A linha não repassa o clique ao mapa; nas ferramentas de criação ele vale como
      // clique no mapa (criar sobre o cabo, marcar vértice, concluir o traçado).
      line.on('click', (event: L.LeafletMouseEvent) => {
        const intent = pathClickIntent(this.activeTool());
        if (intent === 'map') {
          this.emitMapClick(event.latlng);
        } else if (intent === 'cable') {
          this.pathClick.emit(path);
        }
      });
      line.on('dblclick', (event: L.LeafletMouseEvent) => {
        if (pathClickIntent(this.activeTool()) === 'map') {
          this.mapDoubleClick.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
        }
      });
      line.addTo(map);
      this.pathLines.set(path.id, line);
    }

    if (selectedPathId) {
      this.pathLines.get(selectedPathId)?.bringToFront();
    }
  }

  /** Mostra os vértices arrastáveis do cabo em edição ("Editar cabo"). */
  private syncVertexHandles(
    paths: readonly GeoPath[],
    selectedPathId: string | null,
    tool: MapTool,
  ): void {
    const map = this.map;
    const activePath =
      map && this.editable() && tool === 'editCable' && selectedPathId
        ? paths.find((path) => path.id === selectedPathId)
        : undefined;

    this.clearVertexHandles();
    if (!map || !activePath) {
      return;
    }

    activePath.points.forEach((point, index) => {
      const marker = this.createVertexMarker(activePath.id, index, point);
      marker.addTo(map);
      this.vertexMarkers.push(marker);
    });
  }

  private createVertexMarker(pathId: string, index: number, position: GeoPoint): L.Marker {
    const marker = L.marker([position.lat, position.lng], {
      icon: L.divIcon({
        className: 'gf-vertex',
        html: '<span class="gf-vertex__dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      draggable: true,
      keyboard: false,
      riseOnHover: true,
      zIndexOffset: 1200,
    });

    marker.on('drag', () => {
      const latlng = marker.getLatLng();
      this.updatePathVertex(pathId, index, { lat: latlng.lat, lng: latlng.lng }, false);
    });

    marker.on('dragend', () => {
      const latlng = marker.getLatLng();
      this.updatePathVertex(pathId, index, { lat: latlng.lat, lng: latlng.lng }, true);
    });

    return marker;
  }

  /** Atualiza o vértice na polilinha em tempo real e confirma ao soltar. */
  private updatePathVertex(
    pathId: string,
    index: number,
    position: GeoPoint,
    commit: boolean,
  ): void {
    const line = this.pathLines.get(pathId);
    if (line) {
      const latlngs = line.getLatLngs() as L.LatLng[];
      if (latlngs[index]) {
        latlngs[index] = L.latLng(position.lat, position.lng);
        line.setLatLngs(latlngs);
      }
    }

    if (commit) {
      this.pathVertexMoved.emit({ pathId, index, position });
    }
  }

  private clearVertexHandles(): void {
    for (const marker of this.vertexMarkers) {
      marker.remove();
    }
    this.vertexMarkers.length = 0;
  }

  /** Linha-guia tracejada entre a última âncora do traçado e o cursor. */
  private applyRubberBand(tool: MapTool, origin: GeoPoint | null, color: string | null): void {
    const map = this.map;
    if (!map || tool !== 'addCable' || !origin) {
      this.removeRubberBand();
      return;
    }

    const start = L.latLng(origin.lat, origin.lng);
    const end = this.cursorPoint ? L.latLng(this.cursorPoint.lat, this.cursorPoint.lng) : start;
    const stroke = color ?? '#1e88e5';

    if (!this.rubberBand) {
      this.rubberBand = L.polyline([start, end], {
        color: stroke,
        weight: 3,
        dashArray: '6 6',
        opacity: 0.9,
        interactive: false,
      }).addTo(map);
      return;
    }

    this.rubberBand.setStyle({ color: stroke });
    this.rubberBand.setLatLngs([start, end]);
  }

  private removeRubberBand(): void {
    this.rubberBand?.remove();
    this.rubberBand = null;
  }

  // --- Localização do usuário ---------------------------------------------

  private showUserLocation(position: GeoPoint, accuracy: number): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.userMarker?.remove();
    this.accuracyCircle?.remove();

    this.userMarker = L.marker([position.lat, position.lng], {
      icon: createUserLocationIcon(),
      interactive: false,
      keyboard: false,
    }).addTo(map);

    if (Number.isFinite(accuracy) && accuracy > 0) {
      this.accuracyCircle = L.circle([position.lat, position.lng], {
        radius: accuracy,
        color: '#1e88e5',
        weight: 1,
        fillColor: '#1e88e5',
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    }
  }
}
