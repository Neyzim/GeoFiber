/** Regras puras do cliente: explicações das situações, pedidos, portas escolhíveis e frases. */
import {
  BoxResponse,
  CustomerHistoryResponse,
  CustomerRequest,
  CustomerResponse,
  CustomerStatus,
  ServicePortResponse,
} from '../api/api-types';
import { GeoPoint } from '../models/geo.model';
import { statusDefinition } from './network-catalog';

/** O que cada situação significa, para quem não é técnico. */
export const CUSTOMER_STATUS_HELP: Readonly<Record<CustomerStatus, string>> = {
  ACTIVE: 'Ativo: o cliente recebe o serviço pela porta escolhida.',
  BLOCKED:
    'Bloqueado: o serviço está suspenso (por exemplo, falta de pagamento), mas o cadastro e a porta continuam com o cliente.',
  CANCELLED: 'Cancelado: o contrato terminou e a porta é liberada para outro cliente.',
};

/** Pedido completo a partir do cliente atual com as mudanças. Cancelado nunca leva porta. */
export function customerRequest(
  customer: CustomerResponse,
  patch: Partial<CustomerRequest>,
): CustomerRequest {
  const merged: CustomerRequest = {
    name: customer.name ?? '',
    contractCode: customer.contractCode ?? '',
    location: customer.location ?? { longitude: 0, latitude: 0 },
    ...(customer.address ? { address: customer.address } : {}),
    ...(customer.status ? { status: customer.status } : {}),
    ...(customer.servicePortId ? { servicePortId: customer.servicePortId } : {}),
    ...patch,
  };
  if (merged.status === 'CANCELLED' || !merged.servicePortId) {
    delete merged.servicePortId;
  }
  return merged;
}

export interface PortChoice {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
}

/** Portas da CTO para o cliente: só livres e com sinal podem ser escolhidas (e a atual). */
export function portChoices(
  ports: readonly ServicePortResponse[],
  currentPortId?: string,
): PortChoice[] {
  return [...ports]
    .filter((port) => port.id)
    .sort((a, b) => (a.portNumber ?? 0) - (b.portNumber ?? 0))
    .map((port) => {
      const label = port.label ? `Porta ${port.portNumber} · ${port.label}` : `Porta ${port.portNumber}`;
      const id = port.id ?? '';
      if (id === currentPortId) {
        return { id, label, available: true, reason: 'porta atual' };
      }
      const reason = unavailableReason(port);
      return reason ? { id, label, available: false, reason } : { id, label, available: true };
    });
}

function unavailableReason(port: ServicePortResponse): string | null {
  if (port.customerId || port.status === 'OCCUPIED') return 'em uso';
  if (port.status === 'FAULTY') return 'com defeito';
  if (port.status === 'RESERVED') return 'reservada';
  if (!port.splitterPortId && !port.fiberId) return 'sem sinal: nada ligado';
  return null;
}

export interface NearbyBox {
  id: string;
  name: string;
  distanceMeters: number | null;
  label: string;
}

const EARTH_RADIUS_M = 6_371_000;

function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function distanceText(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

/** CTOs ordenadas pela distância até o cliente; as sem posição ficam no fim. */
export function nearestBoxes(boxes: readonly BoxResponse[], position: GeoPoint | null): NearbyBox[] {
  return boxes
    .filter((box) => box.id && box.type === 'CTO')
    .map((box) => {
      const name = box.name ?? 'CTO sem nome';
      const meters =
        position && box.location
          ? distanceMeters(position, { lat: box.location.latitude, lng: box.location.longitude })
          : null;
      return {
        id: box.id ?? '',
        name,
        distanceMeters: meters,
        label: meters === null ? name : `${name} (a ${distanceText(meters)})`,
      };
    })
    .sort((a, b) => {
      if (a.distanceMeters === null) return b.distanceMeters === null ? 0 : 1;
      if (b.distanceMeters === null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });
}

/** "Atendido pela CTO-01, porta 3." */
export function describeCustomerService(
  customer: CustomerResponse,
  boxName?: string,
  portNumber?: number,
): string {
  if (customer.status === 'CANCELLED') {
    return 'Contrato cancelado; a porta foi liberada.';
  }
  if (!customer.servicePortId) {
    return 'Ainda sem porta de atendimento.';
  }
  const box = boxName ? `pela ${boxName}` : 'por uma CTO';
  const port = portNumber !== undefined ? `, porta ${portNumber}` : '';
  return `Atendido ${box}${port}.`;
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Uma linha do histórico: quando e o que mudou. */
export function describeHistoryEntry(entry: CustomerHistoryResponse): { when: string; text: string } {
  const status = statusDefinition(entry.status ?? 'ACTIVE').label;
  const port = entry.servicePortId ? 'com porta de atendimento' : 'sem porta';
  const when = entry.changedAt ? dateTime.format(new Date(entry.changedAt)) : '';
  return { when, text: `${status}, ${port}` };
}
