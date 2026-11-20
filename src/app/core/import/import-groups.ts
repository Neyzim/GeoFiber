import type { BoxType, CableRole } from '../api/api-types';
import { normalize } from '../network/network-map-state';
import { CABLE_ROLES } from '../network/network-catalog';
import type { KmlPlacemark, KmlStyle } from './kml-reader';

export type PointTarget = BoxType | 'OLT' | 'IGNORE';
export type LineTarget = CableRole | 'IGNORE';
export type ImportTarget = PointTarget | LineTarget;

/** Itens parecidos (mesma pasta, mesmo ícone ou mesma cor/espessura). */
export interface ImportGroup {
  key: string;
  geometry: 'point' | 'line';
  label: string;
  style: KmlStyle;
  items: KmlPlacemark[];
}

export const POINT_TARGETS: readonly { target: PointTarget; label: string }[] = [
  { target: 'CTO', label: 'CTO' },
  { target: 'CEO', label: 'CEO' },
  { target: 'DIO', label: 'DIO' },
  { target: 'OLT', label: 'OLT' },
  { target: 'IGNORE', label: 'Ignorar' },
];

export const LINE_TARGETS: readonly { target: LineTarget; label: string }[] = [
  ...CABLE_ROLES.map((r) => ({ target: r.role, label: r.label })),
  { target: 'IGNORE', label: 'Ignorar' },
];

const TYPE_PREFIX = /^(cto|ceo|dio|olt)/;

/** Agrupa pontos por pasta + ícone e linhas por pasta + cor + espessura. Pontos antes das linhas. */
export function groupPlacemarks(placemarks: readonly KmlPlacemark[]): ImportGroup[] {
  const groups = new Map<string, ImportGroup>();
  for (const placemark of placemarks) {
    const folder = placemark.folderPath.join('/');
    const style = placemark.style;
    const key =
      placemark.geometry.kind === 'point'
        ? `point|${folder}|${style.iconHref ?? ''}|${style.iconColor ?? ''}`
        : `line|${folder}|${style.lineColor ?? ''}|${style.lineWidth ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        geometry: placemark.geometry.kind === 'point' ? 'point' : 'line',
        label: placemark.folderPath.at(-1) ?? 'Sem pasta',
        style,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(placemark);
  }
  const all = [...groups.values()];
  return [...all.filter((g) => g.geometry === 'point'), ...all.filter((g) => g.geometry === 'line')];
}

/**
 * Sugestão de tipo para um grupo de pontos: pela pasta, senão pela maioria dos nomes.
 * Só sugestão: a pessoa sempre pode trocar.
 */
export function suggestTarget(group: ImportGroup): PointTarget | null {
  if (group.geometry !== 'point') return null;
  const fromFolder = TYPE_PREFIX.exec(normalize(group.label))?.[1];
  if (fromFolder) return toTarget(fromFolder);

  const counts = new Map<string, number>();
  for (const item of group.items) {
    const found = TYPE_PREFIX.exec(normalize(item.name))?.[1];
    if (found) counts.set(found, (counts.get(found) ?? 0) + 1);
  }
  for (const [type, count] of counts) {
    if (count * 2 > group.items.length) return toTarget(type);
  }
  return null;
}

function toTarget(prefix: string): PointTarget {
  return prefix.toUpperCase() as PointTarget;
}
