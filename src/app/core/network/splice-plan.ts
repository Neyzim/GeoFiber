/**
 * Emenda nova no diagrama de fusões: em que bandeja ela entra (ou se precisa criar uma) e qual
 * fibra é a entrada e qual é a saída, com as pontas usadas nesta caixa. Regra pura.
 */
import { AttachmentRole, SpliceRequest, SpliceResponse, TrayResponse } from '../api/api-types';
import { nextNumber } from './box-interior';
import { usedEnd } from './splice-board';

/** Posições da bandeja criada automaticamente. */
export const NEW_TRAY_CAPACITY = 12;

export type TrayChoice =
  | { kind: 'existing'; trayNumber: number }
  | { kind: 'create'; trayNumber: number; capacity: number }
  | { kind: 'full' };

export type SpliceSides = Pick<SpliceRequest, 'inputFiberId' | 'inputFiberEnd' | 'outputFiberId' | 'outputFiberEnd'>;

interface SpliceFiber {
  fiberId: string;
  role: AttachmentRole | undefined;
}

/**
 * A bandeja de menor número com posição livre; sem nenhuma, a próxima a criar (se a caixa ainda
 * comporta); senão, cheia.
 */
export function trayForNewSplice(
  trays: readonly TrayResponse[],
  splices: readonly SpliceResponse[],
  boxTrayCapacity: number | null | undefined,
): TrayChoice {
  const sorted = [...trays].sort((a, b) => (a.trayNumber ?? 0) - (b.trayNumber ?? 0));
  for (const tray of sorted) {
    const number = tray.trayNumber ?? 0;
    const used = tray.usedPositions ?? splices.filter((splice) => splice.trayNumber === number).length;
    if (used < (tray.capacity ?? 0)) return { kind: 'existing', trayNumber: number };
  }
  const trayNumber = nextNumber(sorted.map((tray) => tray.trayNumber ?? 0));
  if (boxTrayCapacity != null && trayNumber > boxTrayCapacity) return { kind: 'full' };
  return { kind: 'create', trayNumber, capacity: NEW_TRAY_CAPACITY };
}

const ROLE_RANK: Record<string, number> = { END: 0, PASS_THROUGH: 1, none: 1, START: 2 };

/** O cabo que chega (ou passa) é a entrada e o que sai é a saída; empate: a primeira tocada entra. */
export function spliceSides(first: SpliceFiber, second: SpliceFiber): SpliceSides {
  const rank = (fiber: SpliceFiber) => ROLE_RANK[fiber.role ?? 'none'];
  const [input, output] = rank(second) < rank(first) ? [second, first] : [first, second];
  return {
    inputFiberId: input.fiberId,
    inputFiberEnd: usedEnd(input.role, 'in'),
    outputFiberId: output.fiberId,
    outputFiberEnd: usedEnd(output.role, 'out'),
  };
}

export function trayChoiceText(choice: TrayChoice): string {
  switch (choice.kind) {
    case 'existing':
      return `Vai para a bandeja ${choice.trayNumber}, na próxima posição livre.`;
    case 'create':
      return `Vou criar a bandeja ${choice.trayNumber} (${choice.capacity} posições).`;
    case 'full':
      return 'Esta caixa não comporta mais bandejas.';
  }
}
