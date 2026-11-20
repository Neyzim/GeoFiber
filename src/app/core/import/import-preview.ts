import type { CableRole } from '../api/api-types';
import type { GeoPath, GeoPoint } from '../models/geo.model';
import type { MapElement } from '../network/map-element';
import { roleDefinition } from '../network/network-catalog';
import type { ImportGroup, ImportTarget } from './import-groups';
import { targetOf, type ImportChoices } from './import-request';
import type { ImportMatch, ExistingNetwork } from './import-match';
import type { KmlPlacemark } from './kml-reader';

export interface ImportPreview {
  elements: MapElement[];
  paths: GeoPath[];
  /** Todas as posições mostradas (para enquadrar o mapa). */
  points: GeoPoint[];
}

/**
 * O que a importação vai fazer, em forma de mapa (somente leitura): itens novos na cor do tipo,
 * movidos (só os que a pessoa mandou atualizar) com um tracejado da posição antiga para a nova.
 * Iguais e ignorados ficam de fora.
 */
export function importPreview(
  groups: readonly ImportGroup[],
  choices: ImportChoices,
  matches: ReadonlyMap<string, ImportMatch>,
  network: ExistingNetwork,
): ImportPreview {
  const elements: MapElement[] = [];
  const paths: GeoPath[] = [];

  for (const group of groups) {
    for (const placemark of group.items) {
      const target = targetOf(group, placemark, choices);
      if (target === null || target === 'IGNORE') continue;
      const match = matches.get(placemark.ref) ?? { status: 'new' as const };

      if (placemark.geometry.kind === 'point') {
        const position = placemark.geometry.point;
        if (match.status === 'new') {
          elements.push(element(placemark, target, position, choices));
        } else if (match.status === 'moved' && choices.moves.has(placemark.ref)) {
          const old = network.elements.find((e) => e.id === match.id)?.position;
          elements.push(element(placemark, target, position, choices));
          if (old) {
            paths.push({
              id: `move:${placemark.ref}`,
              points: [old, position],
              color: '#6b7280',
              weight: 2,
              dashArray: '4 6',
            });
          }
        }
        continue;
      }

      const role = target as CableRole;
      if (match.status === 'new') {
        paths.push(cablePath(`import:${placemark.ref}`, placemark, role));
      } else if (match.status === 'moved' && choices.moves.has(placemark.ref)) {
        paths.push({ ...cablePath(`move:${placemark.ref}`, placemark, role), dashArray: '4 6' });
      }
    }
  }

  const points = [
    ...elements.map((e) => e.position),
    ...paths.flatMap((p) => p.points),
  ];
  return { elements, paths, points };
}

function element(
  placemark: KmlPlacemark,
  target: ImportTarget,
  position: GeoPoint,
  choices: ImportChoices,
): MapElement {
  const isOlt = target === 'OLT';
  return {
    key: `import:${placemark.ref}`,
    kind: isOlt ? 'olt' : 'box',
    id: placemark.ref,
    group: isOlt ? 'olt' : (target as 'CTO' | 'CEO' | 'DIO'),
    name: placemark.name.trim() || '(sem nome)',
    status: choices.usageStatus,
    position,
    details: [],
  };
}

function cablePath(
  id: string,
  placemark: KmlPlacemark,
  role: CableRole,
): GeoPath {
  const points = placemark.geometry.kind === 'line' ? placemark.geometry.points : [];
  return { id, points, color: roleDefinition(role).color, weight: 4 };
}
