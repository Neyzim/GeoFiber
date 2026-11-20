/**
 * Regras puras da tela de fusões: posições da bandeja (inclusive as vazias), ponta usada de cada
 * cabo, se uma fibra pode ser escolhida (e por que não), onde cada fibra está emendada e as frases
 * de ajuda. Nenhum código do backend sai daqui para a tela.
 */
import {
  AttachedCableResponse,
  AttachmentRole,
  FiberEnd,
  OpticalColor,
  SpliceResponse,
  TrayResponse,
} from '../api/api-types';
import { FiberIndex, FiberInfo, isEndFree } from './box-interior';
import { opticalColor } from './optical-catalog';

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

/** Uma posição da bandeja, com a fusão que está nela ou `null` (vazia). */
export interface TrayPosition {
  number: number;
  splice: SpliceResponse | null;
}

/** Todas as posições de 1 até a capacidade, como na bandeja física. */
export function trayPositions(
  capacity: number,
  trayNumber: number,
  splices: readonly SpliceResponse[],
): TrayPosition[] {
  const byPosition = new Map<number, SpliceResponse>();
  for (const splice of splices) {
    if (splice.trayNumber === trayNumber && splice.positionNumber !== undefined) {
      byPosition.set(splice.positionNumber, splice);
    }
  }
  return Array.from({ length: Math.max(0, capacity) }, (_, index) => ({
    number: index + 1,
    splice: byPosition.get(index + 1) ?? null,
  }));
}

/**
 * Fusões da bandeja que não cabem no desenho: sem posição ou acima da capacidade (anteriores à
 * regra de posição no backend).
 */
export function unplacedSplices(
  trays: readonly Pick<TrayResponse, 'trayNumber' | 'capacity'>[],
  trayNumber: number,
  splices: readonly SpliceResponse[],
): SpliceResponse[] {
  const capacity = trays.find((tray) => tray.trayNumber === trayNumber)?.capacity;
  if (capacity === undefined) return [];
  return splices.filter((splice) => {
    if (splice.trayNumber !== trayNumber) return false;
    const position = splice.positionNumber;
    return position === undefined || position < 1 || position > capacity;
  });
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

/** "emendada na bandeja 1, posição 5", "livre nesta caixa" ou o motivo de estar em uso. */
export function fiberLocation(
  info: FiberInfo,
  end: FiberEnd,
  context: Omit<PickContext, 'chosenOther'>,
): string {
  const reason = busyReason(info, end, context);
  if (reason === null) return 'livre nesta caixa';
  return reason.startsWith('já emendada na ') ? reason.slice(3) : reason;
}

/** "CABO-01 Verde·2": cabo, cor do tubo e número da fibra no tubo. */
export function fiberShortName(info: FiberInfo | undefined): string {
  if (!info) return 'Fibra de outro cabo';
  const tube = info.tubeColor ? opticalColor(info.tubeColor).label : `tubo ${info.tubeNumber}`;
  return `${info.cableName} ${tube}·${info.numberInTube}`;
}

const ATTACHMENT_TEXT: Record<AttachmentRole, string> = {
  END: 'chega aqui',
  START: 'sai daqui',
  PASS_THROUGH: 'passa por aqui',
};

export function attachmentText(role: AttachmentRole | undefined): string {
  return role ? ATTACHMENT_TEXT[role] : '';
}

function fiberName(info: FiberInfo): string {
  const color = info.color ? `${opticalColor(info.color).label} ` : '';
  return `${color}(fibra ${info.numberInTube})`;
}

/** Frase de ajuda de cada passo da escolha de fibras. */
export function pickHint(
  input: FiberInfo | undefined,
  output: FiberInfo | undefined,
  inCable: string,
  outCable: string,
): string {
  if (input && output) return 'Pronto. Confira e toque em "Registrar emenda".';
  if (input) return `${fiberName(input)} do ${input.cableName} escolhida. Agora a fibra do ${outCable}.`;
  if (output) return `Agora a fibra do ${inCable} que chega.`;
  return `Toque na fibra do ${inCable} que chega.`;
}

/** Um tubo de um cabo da caixa com as suas fibras, na ordem. */
export interface CableTube {
  number: number;
  color?: OpticalColor;
  fibers: FiberInfo[];
}

export function cableTubes(index: FiberIndex, cableId: string): CableTube[] {
  const tubes = new Map<number, CableTube>();
  for (const info of index.values()) {
    if (info.cableId !== cableId) continue;
    let tube = tubes.get(info.tubeNumber);
    if (!tube) {
      tube = { number: info.tubeNumber, color: info.tubeColor, fibers: [] };
      tubes.set(info.tubeNumber, tube);
    }
    tube.fibers.push(info);
  }
  return [...tubes.values()]
    .sort((a, b) => a.number - b.number)
    .map((tube) => ({ ...tube, fibers: tube.fibers.sort((a, b) => a.numberInTube - b.numberInTube) }));
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
