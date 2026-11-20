import type { GeoPoint } from '../models/geo.model';
import { distanceMeters } from '../network/geo-distance';
import type { MapCable, MapElement } from '../network/map-element';
import { normalize } from '../network/network-map-state';
import type { ImportTarget } from './import-groups';
import type { KmlPlacemark } from './kml-reader';

/** Mesmo elemento até esta distância (metros). */
export const SAME_PLACE_METERS = 5;

export type ImportMatch =
  | { status: 'new'; nameTakenByOtherType?: string }
  | { status: 'same'; id: string }
  | { status: 'moved'; id: string; kind: 'olt' | 'box' | 'cable' };

export interface ExistingNetwork {
  elements: readonly MapElement[];
  cables: readonly MapCable[];
}

interface ImportItem {
  placemark: KmlPlacemark;
  target: ImportTarget;
}

/** Compara cada item do arquivo com a rede atual. Chave do resultado: `ref`. Ignorados ficam de fora. */
export function matchPlacemarks(
  items: readonly ImportItem[],
  network: ExistingNetwork,
): ReadonlyMap<string, ImportMatch> {
  const repeated = repeatedNames(items);
  const result = new Map<string, ImportMatch>();
  for (const { placemark, target } of items) {
    if (target === 'IGNORE') continue;
    const key = normalize(placemark.name);
    const usable = key !== '' && !repeated.has(`${typeKey(placemark, target)}|${key}`);
    if (placemark.geometry.kind === 'line') {
      result.set(placemark.ref, matchCable(placemark, usable, key, network.cables));
    } else {
      result.set(placemark.ref, matchPoint(placemark, target, usable, key, network.elements));
    }
  }
  return result;
}

/** Identifica o tipo do item: pontos por alvo, linhas todas juntas (o papel do cabo não separa). */
function typeKey(placemark: KmlPlacemark, target: ImportTarget): string {
  return placemark.geometry.kind === 'line' ? 'line' : target;
}

/** Nomes que aparecem mais de uma vez no mesmo tipo dentro do arquivo. */
function repeatedNames(items: readonly ImportItem[]): Set<string> {
  const counts = new Map<string, number>();
  for (const { placemark, target } of items) {
    if (target === 'IGNORE') continue;
    const key = normalize(placemark.name);
    if (key === '') continue;
    const id = `${typeKey(placemark, target)}|${key}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([id]) => id));
}

function matchPoint(
  placemark: KmlPlacemark,
  target: ImportTarget,
  usable: boolean,
  key: string,
  elements: readonly MapElement[],
): ImportMatch {
  const point = placemark.geometry.kind === 'point' ? placemark.geometry.point : null;
  const pool = target === 'OLT'
    ? elements.filter((e) => e.kind === 'olt')
    : elements.filter((e) => e.kind === 'box' && e.group === target);

  if (usable) {
    const byName = pool.find((e) => normalize(e.name) === key);
    if (byName && point) {
      const near = distanceMeters(point, byName.position) <= SAME_PLACE_METERS;
      return near
        ? { status: 'same', id: byName.id }
        : { status: 'moved', id: byName.id, kind: byName.kind === 'olt' ? 'olt' : 'box' };
    }
    const other = elements.find((e) => normalize(e.name) === key && !pool.includes(e));
    if (other) {
      return { status: 'new', nameTakenByOtherType: other.kind === 'olt' ? 'OLT' : other.group };
    }
    return { status: 'new' };
  }

  if (point) {
    const nearest = pool.find((e) => distanceMeters(point, e.position) <= SAME_PLACE_METERS);
    if (nearest) return { status: 'same', id: nearest.id };
  }
  return { status: 'new' };
}

function matchCable(
  placemark: KmlPlacemark,
  usable: boolean,
  key: string,
  cables: readonly MapCable[],
): ImportMatch {
  if (placemark.geometry.kind !== 'line') return { status: 'new' };
  const points = placemark.geometry.points;
  const endsOf = (c: MapCable) => ({ a: c.points[0], b: c.points.at(-1) ?? c.points[0] });

  if (usable) {
    const byName = cables.find((c) => normalize(c.name) === key);
    if (byName) {
      return sameEnds(endsOf(byName), points[0], points.at(-1) ?? points[0])
        ? { status: 'same', id: byName.id }
        : { status: 'moved', id: byName.id, kind: 'cable' };
    }
    return { status: 'new' };
  }

  const found = cables.find((c) => sameEnds(endsOf(c), points[0], points.at(-1) ?? points[0]));
  return found ? { status: 'same', id: found.id } : { status: 'new' };
}

/** Pontas do cabo batem com as do item, em qualquer ordem, até 5 m. */
function sameEnds(
  cable: { a: GeoPoint; b: GeoPoint },
  first: GeoPoint,
  last: GeoPoint,
): boolean {
  const close = (p: GeoPoint, q: GeoPoint) => distanceMeters(p, q) <= SAME_PLACE_METERS;
  return (close(cable.a, first) && close(cable.b, last)) || (close(cable.a, last) && close(cable.b, first));
}
