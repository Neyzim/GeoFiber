/**
 * Tipos geográficos básicos compartilhados por todo o app.
 * Todas as coordenadas usam WGS84 (EPSG:4326), o mesmo sistema do Leaflet.
 */

/** Ponto geográfico em graus decimais. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Retângulo delimitador geográfico. */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Ferramenta de interação ativa no mapa. */
export type MapTool = 'select' | 'addPin' | 'addCable' | 'move' | 'editCable';

/** Estado de visualização atual do mapa. */
export interface MapViewState {
  center: GeoPoint;
  zoom: number;
}

/** Polilinha desenhada sobre o mapa (cabos e pré-visualizações). */
export interface GeoPath {
  id: string;
  points: GeoPoint[];
  color: string;
  /** Espessura em pixels. */
  weight: number;
  /** Padrão de tracejado SVG (ex.: `12 7`); ausente = linha contínua. */
  dashArray?: string;
  /** Desenha um marcador em cada vértice (usado na pré-visualização). */
  showVertices?: boolean;
  /** HTML do balão de informações exibido quando o cabo é selecionado. */
  popupHtml?: string;
}

/** Emitido quando o usuário clica no mapa. */
export interface MapClickEvent {
  position: GeoPoint;
  tool: MapTool;
}

/** Emitido quando um PIN é reposicionado por arrasto. */
export interface PinMoveEvent {
  pinId: string;
  position: GeoPoint;
}

/** Emitido quando um vértice de um cabo é arrastado para outra posição. */
export interface PathVertexMoveEvent {
  pathId: string;
  index: number;
  position: GeoPoint;
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Converte graus decimais em graus/minutos/segundos (hemisfério incluído). */
export function toDegreesMinutesSeconds(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${hemisphere}`;
}
