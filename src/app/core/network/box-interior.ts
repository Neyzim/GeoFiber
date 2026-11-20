/**
 * Regras puras do interior da caixa: nomes de fibras para leigos, fibras livres para ligar,
 * splitters, origem do sinal das portas e o resumo da caixa.
 */
import {
  BoxOverviewResponse,
  CableFiberResponse,
  FiberEnd,
  FiberEndResponse,
  OpticalColor,
  ServicePortResponse,
  SplitterRatio,
  SpliceResponse,
  SplitterResponse,
} from '../api/api-types';
import { opticalColor } from './optical-catalog';

/** Fibra de um cabo da caixa, com o nome do cabo. */
export interface FiberInfo {
  id: string;
  cableId: string;
  cableName: string;
  tubeNumber: number;
  tubeColor?: OpticalColor;
  numberInTube: number;
  absoluteNumber: number;
  color?: OpticalColor;
  status: CableFiberResponse['status'];
  ends: readonly FiberEndResponse[];
}

export type FiberIndex = ReadonlyMap<string, FiberInfo>;

export interface CableFibers {
  cableId: string;
  name: string;
  fibers: readonly CableFiberResponse[];
}

export function indexFibers(cables: readonly CableFibers[]): Map<string, FiberInfo> {
  const index = new Map<string, FiberInfo>();
  for (const cable of cables) {
    for (const fiber of cable.fibers) {
      if (!fiber.id) continue;
      index.set(fiber.id, {
        id: fiber.id,
        cableId: cable.cableId,
        cableName: cable.name,
        tubeNumber: fiber.tubeNumber ?? 0,
        tubeColor: fiber.tubeColor,
        numberInTube: fiber.numberInTube ?? 0,
        absoluteNumber: fiber.absoluteNumber ?? 0,
        color: fiber.color,
        status: fiber.status,
        ends: fiber.ends ?? [],
      });
    }
  }
  return index;
}

/** "CABO-01, tubo 1 (Verde), fibra 3 (Branco)". */
export function fiberLabel(info: FiberInfo | undefined): string {
  if (!info) {
    return 'Fibra de outro cabo';
  }
  const tube = info.tubeColor
    ? `tubo ${info.tubeNumber} (${opticalColor(info.tubeColor).label})`
    : `tubo ${info.tubeNumber}`;
  const fiber = info.color
    ? `fibra ${info.numberInTube} (${opticalColor(info.color).label})`
    : `fibra ${info.numberInTube}`;
  return `${info.cableName}, ${tube}, ${fiber}`;
}

/** A ponta está livre: fibra utilizável e nada ligado nessa ponta. */
export function isEndFree(info: FiberInfo, end: FiberEnd): boolean {
  if (info.status === 'BROKEN' || info.status === 'RESERVED') {
    return false;
  }
  const current = info.ends.find((item) => item.end === end);
  return !current?.link?.type;
}

export interface FiberOption {
  id: string;
  label: string;
}

/** Fibras que podem ser ligadas na ponta `end`, por cabo e número. `keep` fica mesmo ocupada. */
export function fiberOptions(index: FiberIndex, end: FiberEnd, keep?: string): FiberOption[] {
  return [...index.values()]
    .filter((info) => info.id === keep || isEndFree(info, end))
    .sort(
      (a, b) =>
        a.cableName.localeCompare(b.cableName, 'pt-BR') || a.absoluteNumber - b.absoluteNumber,
    )
    .map((info) => ({ id: info.id, label: fiberLabel(info) }));
}

/** Pontas padrão (as mesmas que o backend usa quando a ponta não é informada). */
export const DEFAULT_ENDS = {
  spliceInput: 'B',
  spliceOutput: 'A',
  connectorA: 'B',
  connectorB: 'A',
  splitterInput: 'B',
  splitterOutput: 'A',
  servicePort: 'B',
} as const satisfies Record<string, FiberEnd>;

export interface RatioDefinition {
  ratio: SplitterRatio;
  label: string;
  outputs: number;
}

export const SPLITTER_RATIOS: readonly RatioDefinition[] = [
  { ratio: 'RATIO_1_2', label: '1:2', outputs: 2 },
  { ratio: 'RATIO_1_4', label: '1:4', outputs: 4 },
  { ratio: 'RATIO_1_8', label: '1:8', outputs: 8 },
  { ratio: 'RATIO_1_16', label: '1:16', outputs: 16 },
  { ratio: 'RATIO_1_32', label: '1:32', outputs: 32 },
  { ratio: 'RATIO_1_64', label: '1:64', outputs: 64 },
];

export function splitterLabel(splitter: Pick<SplitterResponse, 'ratio' | 'balanced'>): string {
  const ratio = SPLITTER_RATIOS.find((item) => item.ratio === splitter.ratio)?.label ?? '?';
  return `Splitter ${ratio} (${splitter.balanced === false ? 'desbalanceado' : 'balanceado'})`;
}

/** A porta 1 do splitter é a entrada; a porta 2 é a saída 1. */
export function outputNumber(port: { portNumber?: number }): number {
  return (port.portNumber ?? 1) - 1;
}

/** De onde vem o sinal da porta de atendimento, em frase simples. */
export function describeServicePortSource(
  port: Pick<ServicePortResponse, 'splitterPortId' | 'fiberId'>,
  splitters: readonly SplitterResponse[],
  index: FiberIndex,
): string {
  if (port.splitterPortId) {
    for (const splitter of splitters) {
      const output = splitter.ports?.find((item) => item.id === port.splitterPortId);
      if (output) {
        return `Recebe sinal do ${splitterLabel(splitter)}, saída ${outputNumber(output)}`;
      }
    }
    return 'Recebe sinal de um splitter';
  }
  if (port.fiberId) {
    return `Ligada direto a ${fiberLabel(index.get(port.fiberId))}`;
  }
  return 'Sem sinal: nada ligado';
}

function count(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

function joinParts(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** "Esta caixa recebe 2 cabos. Tem 1 fusão, 1 splitter e 8 portas de atendimento (3 com cliente)." */
export function describeBoxSummary(overview: BoxOverviewResponse): string {
  const cables = overview.cables?.length ?? 0;
  const splices = overview.splices?.length ?? 0;
  const connectors = overview.connections?.filter((item) => item.type === 'CONNECTOR').length ?? 0;
  const splitters = overview.splitters?.length ?? 0;
  const ports = overview.servicePorts ?? [];
  const withCustomer = ports.filter((port) => port.customerId).length;

  const parts: string[] = [];
  if (splices) parts.push(count(splices, 'fusão', 'fusões'));
  if (connectors) parts.push(count(connectors, 'conector', 'conectores'));
  if (splitters) parts.push(count(splitters, 'splitter', 'splitters'));
  if (ports.length) {
    parts.push(
      `${count(ports.length, 'porta de atendimento', 'portas de atendimento')} (${withCustomer} com cliente)`,
    );
  }

  if (!cables && !parts.length) {
    return 'Nada foi registrado dentro desta caixa ainda.';
  }
  const first = cables
    ? `Esta caixa recebe ${count(cables, 'cabo', 'cabos')}.`
    : 'Nenhum cabo chega a esta caixa ainda.';
  const second = parts.length
    ? `Tem ${joinParts(parts)}.`
    : 'Ainda não há ligações registradas dentro dela.';
  return `${first} ${second}`;
}

export function nextNumber(numbers: readonly number[]): number {
  return numbers.reduce((max, value) => Math.max(max, value), 0) + 1;
}

/** Um lado do diagrama de emenda: cabo, tubo e fibra. */
export interface DiagramEnd {
  cable: string;
  tubeColor?: OpticalColor;
  tubeNumber?: number;
  fiberColor?: OpticalColor;
  fiberNumber?: number;
}

/**
 * O meio do diagrama: fusão (posição na bandeja e perda) ou conector.
 * `label` é o texto pronto da perda (fusão) ou "Conector"; sem ele, a perda vem de `attenuationDb`.
 */
export interface DiagramMiddle {
  type: 'splice' | 'connector';
  label?: string;
  positionNumber?: number;
  attenuationDb?: number;
}

const DB_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "0,05 dB". */
export function formatAttenuation(attenuationDb: number | null | undefined): string | undefined {
  return attenuationDb === undefined || attenuationDb === null
    ? undefined
    : `${DB_FORMAT.format(attenuationDb)} dB`;
}

export function diagramEnd(fiber: FiberInfo | undefined): DiagramEnd | undefined {
  if (!fiber) return undefined;
  return {
    cable: fiber.cableName,
    tubeColor: fiber.tubeColor,
    tubeNumber: fiber.tubeNumber,
    fiberColor: fiber.color,
    fiberNumber: fiber.numberInTube,
  };
}

/** "Entrada: CABO-01, tubo 1 (Verde), fibra 3 (Branco)" — com nomes de cor, nunca códigos. */
export function describeDiagramEnd(end: DiagramEnd | undefined, role: 'entrada' | 'saída'): string {
  const prefix = role === 'entrada' ? 'Entrada' : 'Saída';
  if (!end) return `${prefix}: nada ligado`;
  const parts = [`${prefix}: ${end.cable}`];
  if (end.tubeNumber !== undefined || end.tubeColor) {
    const color = end.tubeColor ? ` (${opticalColor(end.tubeColor).label})` : '';
    parts.push(`tubo ${end.tubeNumber ?? '?'}${color}`);
  }
  if (end.fiberNumber !== undefined || end.fiberColor) {
    const color = end.fiberColor ? ` (${opticalColor(end.fiberColor).label})` : '';
    parts.push(`fibra ${end.fiberNumber ?? '?'}${color}`);
  }
  return parts.join(', ');
}

export function spliceMiddle(
  splice: Pick<SpliceResponse, 'positionNumber' | 'attenuationDb'>,
): DiagramMiddle {
  return {
    type: 'splice',
    positionNumber: splice.positionNumber,
    label: formatAttenuation(splice.attenuationDb),
  };
}

export function connectorMiddle(): DiagramMiddle {
  return { type: 'connector', label: 'Conector' };
}

/** "Posição 5 · 0,05 dB" ou "Conector". */
export function describeDiagramMiddle(middle: DiagramMiddle | undefined): string {
  if (!middle) return '';
  if (middle.type === 'connector') return middle.label ?? 'Conector';
  const parts: string[] = [];
  if (middle.positionNumber !== undefined) parts.push(`Posição ${middle.positionNumber}`);
  const loss = middle.label ?? formatAttenuation(middle.attenuationDb);
  if (loss) parts.push(loss);
  return parts.join(' · ');
}
