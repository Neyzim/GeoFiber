/**
 * Diagrama de fusões: o destino de cada fibra de cada cabo da caixa, em frase curta, e os
 * splitters com as suas saídas. Regra pura, lida pela lista do celular e pelo desenho do computador.
 * Nenhum código do backend sai daqui para a tela.
 */
import {
  AttachmentRole,
  BoxOverviewResponse,
  FiberEnd,
  OpticalColor,
  SplitterResponse,
} from '../api/api-types';
import { FiberIndex, FiberInfo, SPLITTER_RATIOS, outputNumber } from './box-interior';
import { opticalColor } from './optical-catalog';
import { attachmentText, usedEnd } from './splice-board';

export type DestinationKind =
  | 'splice'
  | 'splitter-in'
  | 'splitter-out'
  | 'connector'
  | 'service-port'
  | 'pass-through'
  | 'free'
  | 'broken'
  | 'reserved'
  | 'elsewhere';

export interface FiberDestination {
  kind: DestinationKind;
  /** Texto curto da linha ("→ Splitter 1:16", "livre"). */
  text: string;
  spliceId?: string;
  splitterId?: string;
  connectionId?: string;
  servicePortId?: string;
  /** A outra fibra da fusão ou do conector. */
  otherFiberId?: string;
}

export interface FiberRow {
  fiber: FiberInfo;
  /** Ponta da fibra considerada nesta caixa. */
  end: FiberEnd;
  destination: FiberDestination;
}

export interface TubeView {
  number: number;
  color?: OpticalColor;
  used: number;
  total: number;
  rows: FiberRow[];
}

export interface CableView {
  cableId: string;
  name: string;
  role: AttachmentRole | undefined;
  roleText: string;
  tubes: TubeView[];
  empty: boolean;
}

export interface SplitterOutput {
  number: number;
  used: boolean;
  text: string;
  customer?: string;
}

export interface SplitterView {
  id: string;
  label: string;
  inputText: string;
  outputs: SplitterOutput[];
}

const NOT_USED: ReadonlySet<DestinationKind> = new Set(['free', 'pass-through', 'broken', 'reserved']);
const ROLE_ORDER: Record<string, number> = { END: 0, PASS_THROUGH: 1, none: 2, START: 3 };

/** "Splitter 1:16". */
export function splitterShort(splitter: Pick<SplitterResponse, 'ratio'>): string {
  const ratio = SPLITTER_RATIOS.find((item) => item.ratio === splitter.ratio)?.label ?? '?';
  return `Splitter ${ratio}`;
}

/** "BACKBONE · Verde 1": cabo, cor do tubo e número da fibra no tubo. */
function shortFiber(info: FiberInfo | undefined): string {
  if (!info) return 'fibra de outro cabo';
  const tube = info.tubeColor ? opticalColor(info.tubeColor).label : `tubo ${info.tubeNumber}`;
  return `${info.cableName} · ${tube} ${info.numberInTube}`;
}

/** Índices do overview para achar o que está ligado nesta caixa. */
function boxContext(overview: BoxOverviewResponse) {
  const splices = new Map((overview.splices ?? []).map((item) => [item.id ?? '', item]));
  const connectors = new Map(
    (overview.connections ?? []).filter((item) => item.type === 'CONNECTOR').map((item) => [item.id ?? '', item]),
  );
  const servicePorts = new Map((overview.servicePorts ?? []).map((item) => [item.id ?? '', item]));
  const splitterPorts = new Map<string, { splitter: SplitterResponse; portNumber?: number; direction?: string }>();
  for (const splitter of overview.splitters ?? []) {
    for (const port of splitter.ports ?? []) {
      if (port.id) splitterPorts.set(port.id, { splitter, portNumber: port.portNumber, direction: port.direction });
    }
  }
  const customerByPort = new Map<string, string>();
  for (const customer of overview.customers ?? []) {
    if (customer.servicePortId) customerByPort.set(customer.servicePortId, customer.name ?? '(sem nome)');
  }
  return { splices, connectors, servicePorts, splitterPorts, customerByPort };
}

type BoxContext = ReturnType<typeof boxContext>;

/** A ponta tem ligação que existe neste overview. */
function linkedHere(info: FiberInfo, end: FiberEnd, context: BoxContext): boolean {
  const link = info.ends.find((item) => item.end === end)?.link;
  if (!link?.id) return false;
  switch (link.type) {
    case 'FUSION':
      return context.splices.has(link.id);
    case 'CONNECTOR':
      return context.connectors.has(link.id);
    case 'SPLITTER_PORT':
      return context.splitterPorts.has(link.id);
    case 'SERVICE_PORT':
      return context.servicePorts.has(link.id);
    default:
      return false;
  }
}

function rowEnd(info: FiberInfo, role: AttachmentRole | undefined, context: BoxContext): FiberEnd {
  if (role === 'END') return usedEnd(role, 'in');
  if (role === 'START') return usedEnd(role, 'out');
  if (linkedHere(info, 'B', context)) return 'B';
  if (linkedHere(info, 'A', context)) return 'A';
  return 'B';
}

function destination(
  info: FiberInfo,
  end: FiberEnd,
  role: AttachmentRole | undefined,
  index: FiberIndex,
  context: BoxContext,
): FiberDestination {
  if (info.status === 'BROKEN') return { kind: 'broken', text: 'rompida' };
  if (info.status === 'RESERVED') return { kind: 'reserved', text: 'reservada' };
  const link = info.ends.find((item) => item.end === end)?.link;
  if (!link?.id) {
    return role === 'PASS_THROUGH' ? { kind: 'pass-through', text: 'passa direto' } : { kind: 'free', text: 'livre' };
  }
  const id = link.id;
  if (link.type === 'FUSION' && context.splices.has(id)) {
    const splice = context.splices.get(id)!;
    const other = splice.inputFiberId === info.id ? splice.outputFiberId : splice.inputFiberId;
    return { kind: 'splice', spliceId: id, otherFiberId: other, text: `→ ${shortFiber(index.get(other ?? ''))}` };
  }
  if (link.type === 'CONNECTOR' && context.connectors.has(id)) {
    const connection = context.connectors.get(id)!;
    const other = connection.fiberAId === info.id ? connection.fiberBId : connection.fiberAId;
    return { kind: 'connector', connectionId: id, otherFiberId: other, text: '→ conector' };
  }
  if (link.type === 'SPLITTER_PORT' && context.splitterPorts.has(id)) {
    const { splitter, portNumber, direction } = context.splitterPorts.get(id)!;
    const name = splitterShort(splitter);
    if (direction === 'INPUT') return { kind: 'splitter-in', splitterId: splitter.id, text: `→ ${name}` };
    return {
      kind: 'splitter-out',
      splitterId: splitter.id,
      text: `← ${name} · saída ${outputNumber({ portNumber })}`,
    };
  }
  if (link.type === 'SERVICE_PORT' && context.servicePorts.has(id)) {
    const port = context.servicePorts.get(id)!;
    const customer = context.customerByPort.get(id);
    return {
      kind: 'service-port',
      servicePortId: id,
      text: `→ porta ${port.portNumber}${customer ? ` · ${customer}` : ''}`,
    };
  }
  if (link.type === 'OLT_PORT') return { kind: 'elsewhere', text: 'ligada à OLT' };
  return { kind: 'elsewhere', text: 'em outra caixa' };
}

/** Cabos da caixa (chegam, passam, saem) com tubos e fibras e o destino de cada fibra. */
export function boxFiberMap(overview: BoxOverviewResponse, index: FiberIndex): CableView[] {
  const context = boxContext(overview);
  const cables = [...(overview.cables ?? [])].sort(
    (a, b) => ROLE_ORDER[a.attachmentRole ?? 'none'] - ROLE_ORDER[b.attachmentRole ?? 'none'],
  );
  return cables.map((cable) => {
    const cableId = cable.cableId ?? '';
    const role = cable.attachmentRole;
    const tubes = new Map<number, TubeView>();
    for (const info of index.values()) {
      if (info.cableId !== cableId) continue;
      let tube = tubes.get(info.tubeNumber);
      if (!tube) {
        tube = { number: info.tubeNumber, color: info.tubeColor, used: 0, total: 0, rows: [] };
        tubes.set(info.tubeNumber, tube);
      }
      const end = rowEnd(info, role, context);
      const row = { fiber: info, end, destination: destination(info, end, role, index, context) };
      tube.rows.push(row);
      tube.total += 1;
      if (!NOT_USED.has(row.destination.kind)) tube.used += 1;
    }
    const sorted = [...tubes.values()]
      .sort((a, b) => a.number - b.number)
      .map((tube) => ({ ...tube, rows: tube.rows.sort((a, b) => a.fiber.numberInTube - b.fiber.numberInTube) }));
    return {
      cableId,
      name: cable.name ?? '',
      role,
      roleText: attachmentText(role),
      tubes: sorted,
      empty: sorted.length === 0,
    };
  });
}

/** Splitters da caixa: entrada e saídas (porta de atendimento com cliente, fibra ou livre). */
export function boxSplitters(overview: BoxOverviewResponse, index: FiberIndex): SplitterView[] {
  const context = boxContext(overview);
  return (overview.splitters ?? []).map((splitter) => {
    const ports = splitter.ports ?? [];
    const input = ports.find((port) => port.direction === 'INPUT');
    const outputs = ports
      .filter((port) => port.direction === 'OUTPUT')
      .sort((a, b) => (a.portNumber ?? 0) - (b.portNumber ?? 0))
      .map((port): SplitterOutput => {
        const number = outputNumber(port);
        if (port.servicePortId) {
          const servicePort = context.servicePorts.get(port.servicePortId);
          const customer = context.customerByPort.get(port.servicePortId);
          const text = `porta ${servicePort?.portNumber ?? number}`;
          return customer ? { number, used: true, text, customer } : { number, used: false, text };
        }
        if (port.fiberId) return { number, used: true, text: shortFiber(index.get(port.fiberId)) };
        return { number, used: false, text: 'livre' };
      });
    return {
      id: splitter.id ?? '',
      label: splitterShort(splitter),
      inputText: input?.fiberId ? shortFiber(index.get(input.fiberId)) : 'sem entrada',
      outputs,
    };
  });
}
