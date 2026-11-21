import type { TraceBranch, TraceBreak, TraceDirection, TraceKind, TraceResponse, TraceStep } from './trace-types';

describe('trace-types', () => {
  it('expõe os apelidos do contrato gerado de rastreio', () => {
    const kind: TraceKind = 'SPLITTER_PORT';
    const direction: TraceDirection = 'DOWNSTREAM';
    const step: TraceStep = { kind: 'CABLE', id: 'c1', label: 'CABO-01', fiber: { color: 'YELLOW', number: 2, tube: 'GREEN' } };
    const breakPoint: TraceBreak = { reason: 'NO_CONNECTION', at: { kind: 'FIBER_END', id: 'f1', label: 'F' } };
    const branch: TraceBranch = { outputNumber: 1, status: 'CUSTOMERS', customerCount: 4, traceRef: 'p1' };
    const response: TraceResponse = {
      direction,
      status: 'BROKEN',
      steps: [step],
      breaks: [breakPoint],
      branches: [branch],
      customers: [{ id: 'k1', name: 'Ana' }],
    };

    expect(kind).toBe('SPLITTER_PORT');
    expect(response.breaks?.[0].reason).toBe('NO_CONNECTION');
    expect(response.branches?.[0].traceRef).toBe('p1');
  });
});
