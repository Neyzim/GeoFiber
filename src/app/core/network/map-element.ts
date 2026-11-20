/**
 * Formas enxutas que o mapa, a legenda e as fichas usam, convertidas das respostas da API.
 */
import {
  BoxResponse,
  CableResponse,
  CableRole,
  CustomerResponse,
  CustomerStatus,
  InfrastructureStatus,
  OltResponse,
} from '../api/api-types';
import { toGeoPoint, toGeoPoints } from '../api/coordinates';
import { GeoPoint } from '../models/geo.model';
import {
  ElementGroup,
  ElementKind,
  groupDefinition,
  roleDefinition,
  statusDefinition,
} from './network-catalog';

export interface ElementDetail {
  label: string;
  value: string;
}

/** Ponto no mapa: OLT, caixa ou cliente. */
export interface MapElement {
  /** Chave única entre todos os tipos: `kind:id`. */
  key: string;
  kind: ElementKind;
  id: string;
  group: ElementGroup;
  name: string;
  status: InfrastructureStatus | CustomerStatus;
  position: GeoPoint;
  details: readonly ElementDetail[];
}

export interface MapCable {
  id: string;
  name: string;
  role: CableRole;
  status: InfrastructureStatus;
  points: readonly GeoPoint[];
  fiberCapacity: number;
  lengthMeters: number | null;
  details: readonly ElementDetail[];
}

const DEFAULT_STATUS: InfrastructureStatus = 'PLANNED';
const meters = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function oltToElement(olt: OltResponse): MapElement | null {
  if (!olt.id || !olt.location) {
    return null;
  }
  const status = olt.usageStatus ?? DEFAULT_STATUS;
  return {
    key: `olt:${olt.id}`,
    kind: 'olt',
    id: olt.id,
    group: 'olt',
    name: olt.name ?? '',
    status,
    position: toGeoPoint(olt.location),
    details: compact([
      ['Tipo', groupDefinition('olt').longLabel],
      ['Situação', statusDefinition(status).label],
      ['Modelo', olt.model],
    ]),
  };
}

export function boxToElement(box: BoxResponse): MapElement | null {
  if (!box.id || !box.location || !box.type) {
    return null;
  }
  const status = box.usageStatus ?? DEFAULT_STATUS;
  return {
    key: `box:${box.id}`,
    kind: 'box',
    id: box.id,
    group: box.type,
    name: box.name ?? '',
    status,
    position: toGeoPoint(box.location),
    details: compact([
      ['Tipo', groupDefinition(box.type).longLabel],
      ['Situação', statusDefinition(status).label],
      ['Endereço', box.address],
      ['Portas de atendimento', box.powerCapacity],
      ['Bandejas', box.trayCapacity],
    ]),
  };
}

export function customerToElement(customer: CustomerResponse): MapElement | null {
  if (!customer.id || !customer.location) {
    return null;
  }
  const status = customer.status ?? 'ACTIVE';
  return {
    key: `customer:${customer.id}`,
    kind: 'customer',
    id: customer.id,
    group: 'customer',
    name: customer.name ?? '',
    status,
    position: toGeoPoint(customer.location),
    details: compact([
      ['Contrato', customer.contractCode],
      ['Situação', statusDefinition(status).label],
      ['Endereço', customer.address],
    ]),
  };
}

export function cableToMapCable(cable: CableResponse): MapCable | null {
  if (!cable.id || !cable.role || !cable.coordinates || cable.coordinates.length < 2) {
    return null;
  }
  const status = cable.usageStatus ?? DEFAULT_STATUS;
  const lengthMeters = cable.lengthMeters ?? null;
  return {
    id: cable.id,
    name: cable.name ?? '',
    role: cable.role,
    status,
    points: toGeoPoints(cable.coordinates),
    fiberCapacity: cable.fiberCapacity ?? 0,
    lengthMeters,
    details: compact([
      ['Função', roleDefinition(cable.role).label],
      ['Situação', statusDefinition(status).label],
      ['Fibras', cable.fiberCapacity],
      [
        'Comprimento',
        lengthMeters === null ? undefined : `${meters.format(Math.round(lengthMeters))} m`,
      ],
    ]),
  };
}

function compact(pairs: [string, string | number | undefined | null][]): ElementDetail[] {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}
