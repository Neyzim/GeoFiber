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
import { GeoPoint, MapClickEvent, MapTool, MapViewState, PinMoveEvent } from '../../core/models/geo.model';
import { Pin } from '../../core/models/pin.model';
import { NotificationService } from '../../core/services/notification';
import { createGhostIcon, createPinIcon, createUserLocationIcon, pinTooltipHtml } from './pin-marker';

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

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private ghostMarker: L.Marker | null = null;
  private userMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly markers = new Map<string, L.Marker>();

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
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.markers.clear();
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

  flyTo(position: GeoPoint, zoom?: number): void {
    if (!this.map) {
      return;
    }
    this.map.flyTo([position.lat, position.lng], zoom ?? this.map.getZoom(), { duration: 0.6 });
  }

  /** Enquadra todos os PINs informados; retorna `false` se não houver nada a exibir. */
  fitToPins(pins: readonly Pin[] = this.pins(), maxZoom = 17): boolean {
    if (!this.map || pins.length === 0) {
      return false;
    }
    const bounds = L.latLngBounds(pins.map((pin) => L.latLng(pin.position.lat, pin.position.lng)));
    if (!bounds.isValid()) {
      return false;
    }
    this.map.fitBounds(bounds, { padding: [56, 56], maxZoom, animate: true });
    return true;
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

    map.on('click', (event: L.LeafletMouseEvent) => {
      this.mapClick.emit({
        position: { lat: event.latlng.lat, lng: event.latlng.lng },
        tool: this.activeTool(),
      });
    });

    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      const position: GeoPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (this.activeTool() === 'addPin') {
        this.updateGhost(position);
      }
      this.pointerMove.emit(position);
    });

    map.on('mouseout', () => {
      this.removeGhost();
      this.pointerMove.emit(null);
    });

    map.on('moveend zoomend', () => this.emitView());

    this.observeResize(container);
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
      const existing = this.markers.get(pin.id);
      if (existing) {
        existing.setLatLng([pin.position.lat, pin.position.lng]);
        existing.setIcon(createPinIcon(pin, this.selectedPinId() === pin.id));
        existing.setTooltipContent(pinTooltipHtml(pin));
        continue;
      }

      const marker = this.createMarker(pin);
      marker.addTo(map);
      this.markers.set(pin.id, marker);
      this.applyMarkerDraggable(marker);
    }
  }

  private createMarker(pin: Pin): L.Marker {
    const marker = L.marker([pin.position.lat, pin.position.lng], {
      icon: createPinIcon(pin, this.selectedPinId() === pin.id),
      draggable: true,
      autoPan: true,
      riseOnHover: true,
      keyboard: false,
      title: pin.name,
      zIndexOffset: this.selectedPinId() === pin.id ? 1000 : 0,
    });

    marker.bindTooltip(pinTooltipHtml(pin), {
      direction: 'top',
      offset: L.point(0, -8),
      opacity: 0.95,
      className: 'gf-pin-tooltip',
    });

    marker.on('click', () => this.pinClick.emit(pin));

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      marker.setIcon(createPinIcon(pin, this.selectedPinId() === pin.id));
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

  private applyTool(tool: MapTool): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const container = map.getContainer();
    container.classList.toggle('gf-map--add-pin', tool === 'addPin');
    container.classList.toggle('gf-map--move-pin', tool === 'move');

    for (const marker of this.markers.values()) {
      this.applyMarkerDraggable(marker);
    }

    if (tool !== 'addPin') {
      this.removeGhost();
    }
  }

  // --- Pré-visualização do novo PIN ---------------------------------------

  private updateGhost(position: GeoPoint): void {
    const map = this.map;
    if (!map) {
      return;
    }
    if (!this.ghostMarker) {
      this.ghostMarker = L.marker([position.lat, position.lng], {
        icon: createGhostIcon(),
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
