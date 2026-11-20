import type { BoxType, CableRole, InfrastructureStatus } from '../api/api-types';
import { toCoordinate, toCoordinates } from '../api/coordinates';
import type { ImportCable, ImportElement, ImportEnd, ImportNetworkRequest } from '../api/import-types';
import type { GeoPoint } from '../models/geo.model';
import { distanceMeters } from '../network/geo-distance';
import type { ImportGroup, ImportTarget } from './import-groups';
import type { ImportMatch, ExistingNetwork } from './import-match';
import type { KmlPlacemark } from './kml-reader';
import { normalize } from '../network/network-map-state';

export const DEFAULT_FIBERS = 12;
/** Ponta de cabo ligada à caixa/OLT mais próxima até esta distância (metros). */
export const LINK_END_METERS = 15;
export const MAX_IMPORT_ITEMS = 10000;

/** Escolhas da pessoa na tela de importação. */
export interface ImportChoices {
  /** Por `ImportGroup.key`. `target` null = grupo sem escolha. */
  groups: ReadonlyMap<string, { target: ImportTarget | null; fiberCapacity: number }>;
  /** Troca individual por `ref`. */
  items: ReadonlyMap<string, ImportTarget>;
  /** Refs `moved` que a pessoa mandou atualizar. */
  moves: ReadonlySet<string>;
  usageStatus: InfrastructureStatus;
  linkCableEnds: boolean;
}

/** Pedido montado aqui: as listas sempre existem (podem estar vazias). */
export type BuiltImport = ImportNetworkRequest & {
  elements: ImportElement[];
  cables: ImportCable[];
};

export interface ImportSummary {
  create: number;
  same: number;
  moved: number;
  update: number;
  attachments: number;
  ignored: number;
  undecidedGroups: number;
  total: number;
}

/** Tipo que o item recebe: troca individual, senão o do grupo. */
export function targetOf(
  group: ImportGroup,
  placemark: KmlPlacemark,
  choices: ImportChoices,
): ImportTarget | null {
  return choices.items.get(placemark.ref) ?? choices.groups.get(group.key)?.target ?? null;
}

interface Candidate {
  end: ImportEnd;
  position: GeoPoint;
}

/** Monta o corpo do `POST` e o resumo da tela. Grupos sem escolha não entram. */
export function buildImport(
  groups: readonly ImportGroup[],
  choices: ImportChoices,
  matches: ReadonlyMap<string, ImportMatch>,
  network: ExistingNetwork,
): { request: BuiltImport; summary: ImportSummary } {
  const summary: ImportSummary = {
    create: 0, same: 0, moved: 0, update: 0, attachments: 0, ignored: 0, undecidedGroups: 0, total: 0,
  };
  const elements: ImportElement[] = [];
  const cables: ImportCable[] = [];
  const created: Candidate[] = [];
  const newCables: { cable: ImportCable; first: GeoPoint; last: GeoPoint }[] = [];
  const movedPosition = new Map<string, GeoPoint>();
  const names = takenNames(groups, choices, network);

  for (const group of groups) {
    const decision = choices.groups.get(group.key);
    if (!decision?.target) {
      summary.undecidedGroups++;
      continue;
    }
    for (const placemark of group.items) {
      const target = targetOf(group, placemark, choices);
      if (target === null) continue;
      if (target === 'IGNORE') {
        summary.ignored++;
        continue;
      }
      const match: ImportMatch = matches.get(placemark.ref) ?? { status: 'new' };

      if (placemark.geometry.kind === 'point') {
        const position = placemark.geometry.point;
        if (match.status === 'same') {
          summary.same++;
        } else if (match.status === 'moved') {
          summary.moved++;
          if (choices.moves.has(placemark.ref)) {
            summary.update++;
            movedPosition.set(match.id, position);
            elements.push({
              ref: placemark.ref,
              action: 'MOVE',
              kind: match.kind === 'olt' ? 'OLT' : 'BOX',
              id: match.id,
              location: toCoordinate(position),
            });
          }
        } else {
          summary.create++;
          const isOlt = target === 'OLT';
          const boxType = target as BoxType;
          const typeKey = isOlt ? 'OLT' : boxType;
          const label = isOlt ? 'OLT importada' : `${boxType} importada`;
          const name = placemark.name.trim() || nameFor(names, typeKey, label);
          elements.push({
            ref: placemark.ref,
            action: 'CREATE',
            kind: isOlt ? 'OLT' : 'BOX',
            ...(isOlt ? {} : { type: boxType }),
            name,
            ...(placemark.description ? { description: placemark.description } : {}),
            location: toCoordinate(position),
          });
          created.push({ end: { ref: placemark.ref }, position });
        }
        continue;
      }

      const points = placemark.geometry.points;
      if (match.status === 'same') {
        summary.same++;
      } else if (match.status === 'moved') {
        summary.moved++;
        if (choices.moves.has(placemark.ref)) {
          summary.update++;
          cables.push({ ref: placemark.ref, action: 'RESHAPE', id: match.id, coordinates: toCoordinates(points) });
        }
      } else {
        summary.create++;
        const cable: ImportCable = {
          ref: placemark.ref,
          action: 'CREATE',
          name: placemark.name.trim() || nameFor(names, 'line', 'Cabo importado'),
          role: target as CableRole,
          fiberCapacity: decision.fiberCapacity || DEFAULT_FIBERS,
          ...(placemark.description ? { description: placemark.description } : {}),
          coordinates: toCoordinates(points),
        };
        cables.push(cable);
        newCables.push({ cable, first: points[0], last: points[points.length - 1] });
      }
    }
  }

  if (choices.linkCableEnds) {
    const candidates = networkCandidates(network, movedPosition).concat(created);
    for (const { cable, first, last } of newCables) {
      const start = nearest(first, candidates);
      const end = nearest(last, candidates);
      if (start) {
        cable.start = start.end;
        summary.attachments++;
      }
      if (end) {
        cable.end = end.end;
        summary.attachments++;
      }
    }
  }

  summary.total = summary.create + summary.update;
  return { request: { usageStatus: choices.usageStatus, elements, cables }, summary };
}

/** Nomes já usados, por tipo (normalizados): rede atual e nomes escritos no próprio arquivo. */
interface TakenNames {
  used: Set<string>;
  next: Map<string, number>;
}

/** Chave de tipo igual à regra do backend: caixa por CTO/CEO/DIO, OLT, cabo como `line`. */
function typeKeyOf(target: ImportTarget, geometry: 'point' | 'line'): string {
  return geometry === 'line' ? 'line' : target;
}

function takenNames(
  groups: readonly ImportGroup[],
  choices: ImportChoices,
  network: ExistingNetwork,
): TakenNames {
  const used = new Set<string>();
  for (const e of network.elements) {
    used.add(`${e.kind === 'olt' ? 'OLT' : e.group}|${normalize(e.name)}`);
  }
  for (const c of network.cables) {
    used.add(`line|${normalize(c.name)}`);
  }
  for (const group of groups) {
    for (const item of group.items) {
      const target = targetOf(group, item, choices);
      if (target === null || target === 'IGNORE' || item.name.trim() === '') continue;
      used.add(`${typeKeyOf(target, group.geometry)}|${normalize(item.name)}`);
    }
  }
  return { used, next: new Map() };
}

/** Próximo número livre do tipo: "CTO importada N", pulando nomes já usados. */
function nameFor(names: TakenNames, typeKey: string, label: string): string {
  const counterKey = `${typeKey}|${label}`;
  let n = names.next.get(counterKey) ?? 0;
  let candidate = '';
  let key = '';
  do {
    n++;
    candidate = `${label} ${n}`;
    key = `${typeKey}|${normalize(candidate)}`;
  } while (names.used.has(key));
  names.next.set(counterKey, n);
  names.used.add(key);
  return candidate;
}

/** Caixas e OLTs já existentes, na posição nova quando a pessoa mandou mover. */
function networkCandidates(network: ExistingNetwork, movedPosition: ReadonlyMap<string, GeoPoint>): Candidate[] {
  return network.elements.map((e) => ({
    end: e.kind === 'olt' ? { oltId: e.id } : { boxId: e.id },
    position: movedPosition.get(e.id) ?? e.position,
  }));
}

function nearest(point: GeoPoint, candidates: readonly Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  let bestDistance = LINK_END_METERS;
  for (const candidate of candidates) {
    const d = distanceMeters(point, candidate.position);
    if (d <= bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}
