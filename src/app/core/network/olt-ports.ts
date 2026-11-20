import { OltPortRequest, OltPortResponse } from '../api/api-types';
import { nextNumber } from './box-interior';

export interface SlotGroup {
  slot: number;
  ports: OltPortResponse[];
}

/** Portas agrupadas por placa, placas e portas em ordem. */
export function groupPortsBySlot(ports: readonly OltPortResponse[]): SlotGroup[] {
  const bySlot = new Map<number, OltPortResponse[]>();
  for (const port of ports) {
    const slot = port.slotNumber ?? 0;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), port]);
  }
  return [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slot, list]) => ({
      slot,
      ports: list.sort((a, b) => (a.portNumber ?? 0) - (b.portNumber ?? 0)),
    }));
}

/** Novas portas na placa `slot`, numeradas a partir do maior número já usado nela. */
export function planPorts(
  existing: readonly OltPortResponse[],
  slot: number,
  count: number,
): OltPortRequest[] {
  if (!Number.isInteger(slot) || !Number.isInteger(count) || slot < 1 || count < 1) {
    return [];
  }
  const first = nextNumber(
    existing.filter((port) => port.slotNumber === slot).map((port) => port.portNumber ?? 0),
  );
  return Array.from({ length: count }, (_, index) => ({
    slotNumber: slot,
    portNumber: first + index,
  }));
}

/** "Esta OLT tem 16 portas PON (5 em uso). 2 cabos saem dela." */
export function describeOltSummary(ports: readonly OltPortResponse[], cableCount: number): string {
  if (ports.length === 0) {
    return 'Nenhuma porta PON cadastrada ainda.';
  }
  const inUse = ports.filter((port) => port.status === 'OCCUPIED' || port.fiberId).length;
  const portText = `${ports.length} ${ports.length === 1 ? 'porta PON' : 'portas PON'}`;
  const cables =
    cableCount === 0
      ? 'Nenhum cabo sai dela ainda.'
      : `${cableCount} ${cableCount === 1 ? 'cabo sai' : 'cabos saem'} dela.`;
  return `Esta OLT tem ${portText} (${inUse} em uso). ${cables}`;
}
