import type { TraceBranch, TraceBreakReason, TraceKind, TraceResponse, TraceStatus, TraceStep } from '../api/trace-types';
import { opticalColor } from './optical-catalog';

const BREAK_MESSAGES: Record<TraceBreakReason, string> = {
  NO_CONNECTION: 'Esta ponta não está ligada a nada.',
  NO_SIGNAL: 'Esta porta não recebe sinal.',
  NO_CUSTOMER: 'Esta porta não atende nenhum cliente.',
  LOOP: 'Este caminho volta sobre si mesmo.',
  DEPTH_LIMIT: 'O caminho é longo demais para mostrar tudo.',
};

const HEADLINES: Record<TraceStatus, string> = {
  REACHED_OLT: 'Chega à OLT',
  REACHED_CUSTOMERS: 'Chega aos clientes',
  BROKEN: 'Caminho interrompido',
  EMPTY: 'Nada ligado a este ponto',
};

/** Frase pt-BR para o motivo em que o caminho para. */
export function breakMessage(reason: TraceBreakReason): string {
  return BREAK_MESSAGES[reason];
}

/** Título da ficha conforme a situação do caminho. */
export function headline(response: Pick<TraceResponse, 'status'>): string {
  return response.status ? HEADLINES[response.status] : '';
}

/** Uma linha por saída do splitter. */
export function branchLine(branch: TraceBranch): string {
  const output = `Saída ${branch.outputNumber}`;
  switch (branch.status) {
    case 'CUSTOMERS': {
      const n = branch.customerCount ?? 0;
      return `${output}: ${n} ${n === 1 ? 'cliente' : 'clientes'}`;
    }
    case 'BROKEN':
      return `${output}: interrompida`;
    default:
      return `${output}: livre`;
  }
}

/** Resumo do splitter: "8 saídas: 5 com cliente, 3 livres" (com "N interrompidas" quando houver). */
export function splitterSummary(branches: readonly TraceBranch[]): string {
  if (branches.length === 0) {
    return 'Nenhuma saída ligada ainda';
  }
  const withCustomer = branches.filter((b) => b.status === 'CUSTOMERS').length;
  const free = branches.filter((b) => b.status === 'FREE').length;
  const broken = branches.filter((b) => b.status === 'BROKEN').length;
  const total = `${branches.length} ${branches.length === 1 ? 'saída' : 'saídas'}`;
  const parts = [`${withCustomer} com cliente`, `${free} livres`];
  if (broken > 0) {
    parts.push(`${broken} interrompidas`);
  }
  return `${total}: ${parts.join(', ')}`;
}

const STEP_KIND_LABELS: Record<string, string> = {
  CABLE: 'Cabo',
  FIBER: 'Fibra',
  FIBER_END: 'Ponta de fibra',
  BOX: 'Caixa',
  SPLITTER: 'Splitter',
  SPLITTER_PORT: 'Saída do splitter',
  SPLICE: 'Fusão',
  OLT_PORT: 'Porta da OLT',
  SERVICE_PORT: 'Porta de atendimento',
};

const START_KINDS: readonly TraceKind[] = ['FIBER_END', 'FIBER', 'BOX', 'SPLITTER', 'SPLICE', 'SPLITTER_PORT'];

/** Lê `?trace=KIND:ID` da URL; `null` quando o parâmetro não é um ponto de rastreio válido. */
export function parseTraceQuery(raw: string | null): { kind: TraceKind; id: string } | null {
  if (!raw) return null;
  const separator = raw.indexOf(':');
  if (separator <= 0) return null;
  const kind = raw.slice(0, separator) as TraceKind;
  const id = raw.slice(separator + 1);
  if (!id || !START_KINDS.includes(kind)) return null;
  return { kind, id };
}

/** Nome do tipo de passo para a lista (ex.: "Caixa"). */
export function stepKindLabel(kind: string): string {
  return STEP_KIND_LABELS[kind] ?? kind;
}

/** Texto da fibra com cor e tubo em pt-BR; `undefined` quando o passo não é uma fibra. */
export function fiberText(fiber: TraceStep['fiber']): string | undefined {
  if (!fiber) return undefined;
  const color = opticalColor(fiber.color).label;
  const tube = opticalColor(fiber.tube).label;
  return `Fibra ${fiber.number} (${color}) do tubo ${tube}`;
}
