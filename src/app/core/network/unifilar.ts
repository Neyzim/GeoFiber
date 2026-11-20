/**
 * Linha unifilar do topo da ficha: o que chega → elemento → o que sai.
 */
import type { AttachedCableResponse } from '../api/api-types';

export interface UnifilarEnd {
  label: string;
  detail?: string;
}

export interface UnifilarSides {
  incoming: UnifilarEnd[];
  outgoing: UnifilarEnd[];
}

export interface SplitResult {
  shown: UnifilarEnd[];
  hidden: number;
}

/** Quantos itens aparecem de cada lado antes do "+N". */
export const UNIFILAR_MAX_SHOWN = 3;

function cableEnd(cable: AttachedCableResponse): UnifilarEnd {
  return {
    label: cable.name ?? '',
    detail: cable.fiberCapacity ? `${cable.fiberCapacity} fibras` : undefined,
  };
}

/**
 * Lados de uma caixa: chega o cabo que termina nela (END), sai o que começa nela (START);
 * o cabo que passa (PASS_THROUGH) aparece dos dois lados.
 */
export function boxSides(cables: readonly AttachedCableResponse[]): UnifilarSides {
  return {
    incoming: cables
      .filter((c) => c.attachmentRole === 'END' || c.attachmentRole === 'PASS_THROUGH')
      .map(cableEnd),
    outgoing: cables
      .filter((c) => c.attachmentRole === 'START' || c.attachmentRole === 'PASS_THROUGH')
      .map(cableEnd),
  };
}

/**
 * Lados de um cabo pela lista de elementos: chega do primeiro, sai para o último
 * (o último só conta com 2 ou mais itens). Os do meio ficam no texto do percurso.
 */
export function cableSides(items: readonly { name: string }[]): UnifilarSides {
  return {
    incoming: items.slice(0, 1).map((item) => ({ label: item.name })),
    outgoing: items.length >= 2 ? [{ label: items[items.length - 1].name }] : [],
  };
}

/** Lados de uma OLT: ela é a origem do sinal (nada chega); todos os cabos saem dela. */
export function oltSides(cables: readonly AttachedCableResponse[]): UnifilarSides {
  return { incoming: [], outgoing: cables.map(cableEnd) };
}

/**
 * Lados de um cliente: chega a CTO que o atende (com a porta, quando conhecida); nada sai.
 * Cancelado ou sem CTO → os dois lados vazios.
 */
export function customerSides(
  boxName: string | undefined,
  portNumber: number | undefined,
  cancelled: boolean,
): UnifilarSides {
  if (cancelled || !boxName) return { incoming: [], outgoing: [] };
  const end: UnifilarEnd = portNumber === undefined
    ? { label: boxName }
    : { label: boxName, detail: `porta ${portNumber}` };
  return { incoming: [end], outgoing: [] };
}

/** Os primeiros itens visíveis e quantos ficaram de fora. */
export function splitVisible(items: readonly UnifilarEnd[]): SplitResult {
  return {
    shown: items.slice(0, UNIFILAR_MAX_SHOWN),
    hidden: Math.max(0, items.length - UNIFILAR_MAX_SHOWN),
  };
}
