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
import { GeoPath, GeoPoint, MapClickEvent, MapTool, MapViewState, PathVertexMoveEvent, PinMoveEvent } from '../../core/models/geo.model';
import { Pin } from '../../core/models/pin.model';
import { MapViewportService } from '../../core/services/map-viewport';
import { NetworkModelStoreService } from '../../core/services/network-model-store';
import { NotificationService } from '../../core/services/notification';
import {
  createGhostIcon,
  createPinIcon,
  createUserLocationIcon,
  pinPopupHtml,
  pinTooltipHtml,
} from './pin-marker';

/** Distância (px) dentro da qual um clique no mapa "gruda" em um PIN. */
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
  private readonly models = inject(NetworkModelStoreService);

  /** Visão inicial — aplicada apenas na criação do mapa. */
  readonly initialCenter = input<GeoPoint>(DEFAULT_MAP_VIEW.center);
  readonly initialZoom = input<number>(DEFAULT_MAP_VIEW.zoom);
  readonly minZoom = input<number>(MAP_MIN_ZOOM);
  readonly maxZoom = input<number>(MAP_MAX_ZOOM);

  /** PINs a exibir. */
  readonly pins = input<readonly Pin[]>([]);
  /** PIN destacado. */
  readonly selectedPinId = input<string | null>(null);
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
  /** Âncora do traçado em construção: liga o último PIN ao cursor. */
  readonly draftOrigin = input<GeoPoint | null>(null);
  /** Cor do elemento em criação (usada no PIN fantasma e na linha-guia). */
  readonly previewColor = input<string | null>(null);

  /** Instância do mapa, para consumidores avançados. */
  readonly mapReady = output<L.Map>();
  /** Clique no mapa. */
  readonly mapClick = output<MapClickEvent>();
  /** Clique em um PIN. */
  readonly pinClick = output<Pin>();
  /** PIN arrastado para uma nova posição. */
  readonly pinMoved = output<PinMoveEvent>();
  /** Posição do cursor (`null` quando sai do mapa). */
  readonly pointerMove = output<GeoPoint | null>();
  /** Mudança de centro/zoom. */
  readonly viewChanged = output<MapViewState>();
  /** Localização do usuário obtida com sucesso. */
  readonly located = output<GeoPoint>();
  /** Clique em um cabo. */
  readonly pathClick = output<GeoPath>();
  /** Duplo clique em um PIN (conclui o traçado de cabo). */
  readonly pinDoubleClick = output<Pin>();
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
  private readonly markers = new Map<string, L.Marker>();
  private readonly pathLines = new Map<string, L.Polyline>();
  private readonly vertexMarkers: L.Marker[] = [];

  constructor() {
    afterNextRender(() => this.createMap());

    effect(() => {
      const pins = this.pins();
      if (this.map) {
        this.syncMarkers(pins);
      }
    });

    effect(() => {
      const selectedId = this.selectedPinId();
      if (this.map) {
        this.syncSelection(selectedId);
      }
    });

    effect(() => {
      const tool = this.activeTool();
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
      const pinId = this.selectedPinId();
      const pathId = this.selectedPathId();
      const pins = this.pins();
      const paths = this.paths();
      if (this.map) {
        this.refreshPopup(pinId, pathId, pins, paths);
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
    this.pathLines.clear();
    this.vertexMarkers.length = 0;
    this.rubberBand = null;
    this.snapMarker = null;
  }

  // --- API pública ---------------------------------------------------------

  getMap(): L.Map | null {
    return this.map;
  }

  /** Centro atual do mapa, usado por exemplo para posicionar um novo PIN. */
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
    this.syncMarkers(this.pins());
    this.applyTool(this.activeTool());
    this.syncPaths(this.paths(), this.selectedPathId());

    map.on('click', (event: L.LeafletMouseEvent) => {
      const tool = this.activeTool();
      const raw: GeoPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
      // No traçado de cabo o clique "gruda" em um PIN próximo (ímã).
      const position = tool === 'addCable' ? this.snapToPin(raw) : raw;
      this.mapClick.emit({ position, tool });
    });

    map.on('dblclick', (event: L.LeafletMouseEvent) => {
      this.mapDoubleClick.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      const position: GeoPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
      const tool = this.activeTool();
      if (tool === 'addPin') {
        this.updateGhost(position);
      } else if (tool === 'addCable') {
        const snapped = this.snapToPin(position);
        this.cursorPoint = snapped;
        this.updateSnapIndicator(snapped === position ? null : snapped);
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

  private syncMarkers(pins: readonly Pin[]): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const incoming = new Set(pins.map((pin) => pin.id));
    for (const [id, marker] of this.markers) {
      if (!incoming.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    for (const pin of pins) {
      const model = this.models.findById(pin.modelId);
      const existing = this.markers.get(pin.id);
      if (existing) {
        existing.setLatLng([pin.position.lat, pin.position.lng]);
        existing.setIcon(createPinIcon(pin, this.selectedPinId() === pin.id, model));
        existing.setTooltipContent(pinTooltipHtml(pin, model));
        continue;
      }

      const marker = this.createMarker(pin);
      marker.addTo(map);
      this.markers.set(pin.id, marker);
      this.applyMarkerDraggable(marker);
    }
  }

  private createMarker(pin: Pin): L.Marker {
    const model = this.models.findById(pin.modelId);
    const marker = L.marker([pin.position.lat, pin.position.lng], {
      icon: createPinIcon(pin, this.selectedPinId() === pin.id, model),
      draggable: true,
      autoPan: true,
      riseOnHover: true,
      keyboard: false,
      title: pin.name,
      zIndexOffset: this.selectedPinId() === pin.id ? 1000 : 0,
    });

    marker.bindTooltip(pinTooltipHtml(pin, model), {
      direction: 'top',
      offset: L.point(0, -8),
      opacity: 0.95,
      className: 'gf-pin-tooltip',
    });

    marker.on('click', () => this.pinClick.emit(pin));

    marker.on('dblclick', () => this.pinDoubleClick.emit(pin));

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      marker.setIcon(createPinIcon(pin, this.selectedPinId() === pin.id, model));
      this.pinMoved.emit({
        pinId: pin.id,
        position: { lat: position.lat, lng: position.lng },
      });
    });

    return marker;
  }

  /** Os marcadores só podem ser arrastados na ferramenta "Mover PIN". */
  private applyMarkerDraggable(marker: L.Marker): void {
    if (this.activeTool() === 'move') {
      marker.dragging?.enable();
    } else {
      marker.dragging?.disable();
    }
  }

  private syncSelection(selectedId: string | null): void {
    for (const [id, marker] of this.markers) {
      const element = marker.getElement()?.querySelector('.gf-pin');
      element?.classList.toggle('is-selected', id === selectedId);
      marker.setZIndexOffset(id === selectedId ? 1000 : 0);
    }
  }

  // --- Balão de informações do elemento selecionado ------------------------

  /**
   * Mostra o balão do elemento atualmente selecionado (PIN tem prioridade sobre
   * o cabo) e o fecha quando não há seleção. A seleção em si é decidida pela
   * página: o primeiro clique seleciona; o segundo abre a edição.
   */
  private refreshPopup(
    pinId: string | null,
    pathId: string | null,
    pins: readonly Pin[],
    paths: readonly GeoPath[],
  ): void {
    const pin = pinId ? pins.find((item) => item.id === pinId) : undefined;
    if (pin) {
      const model = this.models.findById(pin.modelId);
      this.showPopup([pin.position.lat, pin.position.lng], pinPopupHtml(pin, model), -34);
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
    container.classList.toggle('gf-map--add-pin', tool === 'addPin');
    container.classList.toggle('gf-map--add-cable', tool === 'addCable');
    container.classList.toggle('gf-map--move-pin', tool === 'move');
    container.classList.toggle('gf-map--edit-cable', tool === 'editCable');

    // O duplo clique finaliza o traçado, portanto não pode dar zoom.
    if (tool === 'addCable') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    for (const marker of this.markers.values()) {
      this.applyMarkerDraggable(marker);
    }

    if (tool !== 'addPin') {
      this.removeGhost();
    }
    if (tool !== 'addCable') {
      this.updateSnapIndicator(null);
    }
  }

  /** Retorna o PIN mais próximo dentro do raio do ímã; senão, o próprio ponto. */
  private snapToPin(position: GeoPoint): GeoPoint {
    const map = this.map;
    if (!map) {
      return position;
    }
    const point = map.latLngToContainerPoint([position.lat, position.lng]);
    let best: GeoPoint | null = null;
    let bestDistance = SNAP_DISTANCE_PX;

    for (const pin of this.pins()) {
      const pinPoint = map.latLngToContainerPoint([pin.position.lat, pin.position.lng]);
      const distance = point.distanceTo(pinPoint);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = pin.position;
      }
    }

    return best ?? position;
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

  // --- Pré-visualização do novo PIN ---------------------------------------

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
        opacity: selected ? 1 : 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      };

      const existing = this.pathLines.get(path.id);
      if (existing) {
        existing.setLatLngs(latlngs);
        existing.setStyle(style);
        continue;
      }

      const line = L.polyline(latlngs, { ...style, bubblingMouseEvents: false });
      line.on('click', () => this.pathClick.emit(path));
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
      map && tool === 'editCable' && selectedPathId
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
