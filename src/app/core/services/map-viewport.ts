import { Injectable, signal } from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../models/geo.model';

/** Zoom aplicado ao centralizar em um único elemento. */
const FOCUS_ZOOM = 17;
/** Zoom máximo ao enquadrar vários pontos (evita exagero em traçados curtos). */
const FIT_MAX_ZOOM = 17;

/**
 * Serviço reutilizável de navegação do mapa.
 *
 * Guarda a instância do Leaflet (registrada pelo `GeoMapComponent` via
 * `mapReady`) e oferece operações de foco independentes de quem as pede:
 * a legenda sobre o mapa, o clique em um elemento ou telas futuras. Assim a
 * regra de "centralizar/enquadrar" existe em um único lugar.
 */
@Injectable({ providedIn: 'root' })
export class MapViewportService {
  private readonly map = signal<L.Map | null>(null);

  /** Registra (ou limpa, com `null`) o mapa ativo. */
  register(map: L.Map | null): void {
    this.map.set(map);
  }

  /** `true` quando já existe um mapa pronto para navegar. */
  get ready(): boolean {
    return this.map() !== null;
  }

  /** Centraliza em um ponto, aplicando o zoom de foco. */
  focus(point: GeoPoint, zoom = FOCUS_ZOOM): boolean {
    const map = this.map();
    if (!map) {
      return false;
    }
    map.flyTo([point.lat, point.lng], zoom, { duration: 0.6 });
    return true;
  }

  /** Enquadra um conjunto de pontos (ex.: vértices de um cabo). */
  focusAll(points: readonly GeoPoint[], maxZoom = FIT_MAX_ZOOM): boolean {
    const map = this.map();
    if (!map || points.length === 0) {
      return false;
    }
    if (points.length === 1) {
      return this.focus(points[0], maxZoom);
    }
    const bounds = L.latLngBounds(points.map((point) => L.latLng(point.lat, point.lng)));
    if (!bounds.isValid()) {
      return false;
    }
    map.fitBounds(bounds, { padding: [56, 56], maxZoom, animate: true });
    return true;
  }
}
