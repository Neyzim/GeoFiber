/**
 * Regras puras da tela de fusões: ponta usada de cada cabo, se uma fibra pode ser escolhida (e por
 * que não), o papel do cabo em frase e os cabos padrão de cada lado da emenda. Nenhum código do backend sai daqui para a tela.
 */
import { AttachedCableResponse, AttachmentRole, FiberEnd, SpliceResponse } from '../api/api-types';
import { FiberInfo, isEndFree } from './box-interior';

/** Lado da emenda: o que chega (entrada) ou o que sai (saída). */
export type SpliceSide = 'in' | 'out';

/**
 * Ponta da fibra usada nesta caixa, pelo papel do cabo: A = início do cabo, B = fim.
 * Cabo que chega aqui (END) usa B; que sai daqui (START) usa A; que passa por aqui (sangria) ou
 * sem papel usa os padrões do backend (B na entrada, A na saída).
 */
export function usedEnd(role: AttachmentRole | undefined, side: SpliceSide): FiberEnd {
  if (role === 'END') return 'B';
  if (role === 'START') return 'A';
  return side === 'in' ? 'B' : 'A';
}

/** "5 fusões em 2 bandejas". */
export function describeTraySummary(splices: number, trays: number): string {
  if (trays === 0) return 'Nenhuma bandeja cadastrada';
  const trayText = `${trays} ${trays === 1 ? 'bandeja' : 'bandejas'}`;
  if (splices === 0) return `Nenhuma fusão em ${trayText}`;
  return `${splices} ${splices === 1 ? 'fusão' : 'fusões'} em ${trayText}`;
}

export interface PickContext {
  boxId: string;
  splices: readonly SpliceResponse[];
  /** Fibra já escolhida do outro lado (não pode ser a mesma). */
  chosenOther?: string;
}

export interface FiberPick {
  free: boolean;
  reason: string | null;
}

function spotText(splice: SpliceResponse | undefined): string | null {
  if (!splice) return null;
  return splice.positionNumber !== undefined
    ? `bandeja ${splice.trayNumber}, posição ${splice.positionNumber}`
    : `bandeja ${splice.trayNumber}`;
}

/** Por que a ponta `end` não está livre, em frase simples; `null` quando está livre. */
function busyReason(info: FiberInfo, end: FiberEnd, context: PickContext): string | null {
  if (isEndFree(info, end)) return null;
  if (info.status === 'BROKEN') return 'rompida';
  if (info.status === 'RESERVED') return 'reservada';
  const link = info.ends.find((item) => item.end === end)?.link;
  switch (link?.type) {
    case 'FUSION': {
      if (link.elementId && link.elementId !== context.boxId) return 'emendada em outra caixa';
      const spot = spotText(context.splices.find((splice) => splice.id === link.id));
      return spot ? `já emendada na ${spot}` : 'já emendada nesta caixa';
    }
    case 'CONNECTOR':
      return 'ligada por conector';
    case 'SPLITTER_PORT':
      return 'ligada a um splitter';
    case 'SERVICE_PORT':
      return 'ligada a uma porta de atendimento';
    case 'OLT_PORT':
      return 'ligada à OLT';
    default:
      return 'em uso';
  }
}

/** Se a fibra pode ser tocada no seletor e, se não puder, o motivo. */
export function fiberPick(info: FiberInfo, end: FiberEnd, context: PickContext): FiberPick {
  if (context.chosenOther === info.id) {
    return { free: false, reason: 'já escolhida do outro lado' };
  }
  const reason = busyReason(info, end, context);
  return { free: reason === null, reason };
}

const ATTACHMENT_TEXT: Record<AttachmentRole, string> = {
  END: 'chega aqui',
  START: 'sai daqui',
  PASS_THROUGH: 'passa por aqui',
};

export function attachmentText(role: AttachmentRole | undefined): string {
  return role ? ATTACHMENT_TEXT[role] : '';
}

/** Cabos padrão das duas colunas: o primeiro que chega à esquerda, outro cabo à direita. */
export function defaultSpliceCables(
  cables: readonly Pick<AttachedCableResponse, 'cableId' | 'attachmentRole'>[],
): [string | null, string | null] {
  if (cables.length === 0) return [null, null];
  const left = cables.find((cable) => cable.attachmentRole === 'END') ?? cables[0];
  const right = cables.find((cable) => cable.cableId !== left.cableId) ?? left;
  return [left.cableId ?? null, right.cableId ?? null];
}
