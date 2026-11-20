/**
 * Forma da linha por estado (Esquema Unifilar): o estado se lê pelo traço, não só pela cor.
 */
import { CustomerStatus, FiberStatus, InfrastructureStatus } from '../api/api-types';

export type LineState = 'active' | 'planned' | 'reserved' | 'disabled' | 'broken';

export interface LineStyle {
  dasharray: string;
  linecap: 'round' | 'butt';
}

const PATTERNS: Readonly<Record<LineState, LineStyle>> = {
  active: { dasharray: '', linecap: 'round' },
  planned: { dasharray: '4 4', linecap: 'round' },
  reserved: { dasharray: '8 3', linecap: 'round' },
  disabled: { dasharray: '1 3', linecap: 'butt' },
  broken: { dasharray: '6 2 1 2', linecap: 'butt' },
};

export function lineStyleByState(state: LineState): LineStyle {
  return { ...PATTERNS[state] };
}

/** Estado da linha para a situação de um elemento de infraestrutura ou de um cliente. */
export function lineStateOf(status: InfrastructureStatus | CustomerStatus): LineState {
  switch (status) {
    case 'PLANNED':
      return 'planned';
    case 'BLOCKED':
      return 'reserved';
    case 'DEACTIVATED':
    case 'CANCELLED':
      return 'disabled';
    case 'DAMAGED':
      return 'broken';
    default:
      return 'active';
  }
}

/** Estado da linha para a situação de uma fibra (sem situação = ativa). */
export function fiberLineState(status: FiberStatus | undefined): LineState {
  switch (status) {
    case 'BROKEN':
      return 'broken';
    case 'RESERVED':
      return 'reserved';
    default:
      return 'active';
  }
}
