import type { TraceResponse, TraceStep } from '../api/trace-types';
import type { GeoPath, GeoPoint } from '../models/geo.model';
import { opticalColor } from './optical-catalog';
import { breakMessage } from './trace-view';

/** Traçado na cor da própria fibra; sem fibra informada, cinza neutro. */
const FALLBACK_COLOR = '#9aa0a6';
/** Contorno escuro por baixo de cada traçado: a fibra clara (amarela, branca) continua visível. */
const CASING_COLOR = '#1b2430';
const PATH_WEIGHT = 6;
const CASING_WEIGHT = 9;

/** Marcador vermelho de uma quebra, com a frase que aparece ao tocar nele. */
export interface TraceMarker {
  key: string;
  point: GeoPoint;
  message: string;
}

export interface TraceMarkers {
  markers: TraceMarker[];
  /** Quebras sem nenhuma posição conhecida: não cabem no mapa. */
  hidden: number;
}

type Coordinates = NonNullable<TraceStep['coordinates']>;

function toPoints(coordinates: Coordinates | undefined): GeoPoint[] {
  return (coordinates ?? []).map((c) => ({ lat: c.latitude, lng: c.longitude }));
}

/**
 * Um traçado por trecho de cabo percorrido (com dois pontos ou mais): o contorno escuro vem antes
 * e a linha da fibra por cima, ambos marcados como destaque.
 */
export function tracePaths(response: TraceResponse): GeoPath[] {
  const paths: GeoPath[] = [];
  response.steps?.forEach((step, index) => {
    if (step.kind !== 'CABLE') return;
    const points = toPoints(step.coordinates);
    if (points.length < 2) return;
    const id = `trace-path-${index}`;
    const color = step.fiber?.color ? opticalColor(step.fiber.color).hex : FALLBACK_COLOR;
    paths.push({ id: `${id}-casing`, points, color: CASING_COLOR, weight: CASING_WEIGHT, emphasis: true });
    paths.push({ id, points, color, weight: PATH_WEIGHT, emphasis: true });
  });
  return paths;
}

/**
 * Um marcador por quebra. Sem posição própria (fibra ou porta dentro da caixa), usa a última
 * caixa do caminho; sem nem isso, a quebra fica oculta no mapa e conta em `hidden`.
 */
export function traceMarkers(response: TraceResponse): TraceMarkers {
  const boxPoint = lastBoxPoint(response);
  const markers: TraceMarker[] = [];
  let hidden = 0;

  (response.breaks ?? []).forEach((item, index) => {
    const own = toPoints(item.at?.coordinates)[0];
    const point = own ?? boxPoint;
    if (!point) {
      hidden += 1;
      return;
    }
    markers.push({
      key: `trace-break-${index}`,
      point,
      message: item.reason ? breakMessage(item.reason) : 'O caminho para aqui.',
    });
  });
  return { markers, hidden };
}

function lastBoxPoint(response: TraceResponse): GeoPoint | undefined {
  const boxes = (response.steps ?? []).filter((step) => step.kind === 'BOX');
  for (let i = boxes.length - 1; i >= 0; i--) {
    const point = toPoints(boxes[i].coordinates)[0];
    if (point) return point;
  }
  return undefined;
}
