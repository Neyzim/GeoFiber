import type { TraceBranch, TraceBreakReason, TraceStatus } from '../api/trace-types';
import { branchLine, breakMessage, fiberText, headline, parseTraceQuery, splitterSummary, stepKindLabel } from './trace-view';

describe('trace-view', () => {
  it('traduz cada motivo de quebra para uma frase pt-BR', () => {
    const cases: [TraceBreakReason, string][] = [
      ['NO_CONNECTION', 'Esta ponta não está ligada a nada.'],
      ['NO_SIGNAL', 'Esta porta não recebe sinal.'],
      ['NO_CUSTOMER', 'Esta porta não atende nenhum cliente.'],
      ['LOOP', 'Este caminho volta sobre si mesmo.'],
      ['DEPTH_LIMIT', 'O caminho é longo demais para mostrar tudo.'],
    ];
    for (const [reason, text] of cases) {
      expect(breakMessage(reason)).toBe(text);
    }
  });

  it('dá o título conforme a situação do caminho', () => {
    const cases: [TraceStatus, string][] = [
      ['REACHED_OLT', 'Chega à OLT'],
      ['REACHED_CUSTOMERS', 'Chega aos clientes'],
      ['BROKEN', 'Caminho interrompido'],
      ['EMPTY', 'Nada ligado a este ponto'],
    ];
    for (const [status, text] of cases) {
      expect(headline({ status })).toBe(text);
    }
  });

  it('descreve cada saída do splitter', () => {
    const withCustomers: TraceBranch = { outputNumber: 3, status: 'CUSTOMERS', customerCount: 4, traceRef: 'p' };
    const one: TraceBranch = { outputNumber: 2, status: 'CUSTOMERS', customerCount: 1, traceRef: 'q' };
    const free: TraceBranch = { outputNumber: 2, status: 'FREE', customerCount: 0 };
    const broken: TraceBranch = { outputNumber: 5, status: 'BROKEN', customerCount: 0 };

    expect(branchLine(withCustomers)).toBe('Saída 3: 4 clientes');
    expect(branchLine(one)).toBe('Saída 2: 1 cliente');
    expect(branchLine(free)).toBe('Saída 2: livre');
    expect(branchLine(broken)).toBe('Saída 5: interrompida');
  });

  it('resume o splitter e trata caso sem saída ligada', () => {
    const branches: TraceBranch[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ outputNumber: i + 1, status: 'CUSTOMERS' as const, customerCount: 1, traceRef: 'x' })),
      ...Array.from({ length: 3 }, (_, i) => ({ outputNumber: i + 6, status: 'FREE' as const, customerCount: 0 })),
    ];
    expect(splitterSummary(branches)).toBe('8 saídas: 5 com cliente, 3 livres');
    expect(splitterSummary([])).toBe('Nenhuma saída ligada ainda');
  });
  it('nomeia o tipo de cada passo e a fibra em pt-BR', () => {
    expect(stepKindLabel('CABLE')).toBe('Cabo');
    expect(stepKindLabel('BOX')).toBe('Caixa');
    expect(stepKindLabel('SPLICE')).toBe('Fusão');
    expect(stepKindLabel('SPLITTER_PORT')).toBe('Saída do splitter');
    expect(stepKindLabel('OLT_PORT')).toBe('Porta da OLT');
    expect(stepKindLabel('SERVICE_PORT')).toBe('Porta de atendimento');
    expect(fiberText({ color: 'YELLOW', number: 2, tube: 'GREEN' })).toBe('Fibra 2 (Amarelo) do tubo Verde');
    expect(fiberText(undefined)).toBeUndefined();
  });
});

describe('parseTraceQuery', () => {
  it('lê KIND:ID do parâmetro da URL e recusa o que não é um rastreio', () => {
    expect(parseTraceQuery('SPLICE:abc')).toEqual({ kind: 'SPLICE', id: 'abc' });
    expect(parseTraceQuery('SPLITTER_PORT:p1')).toEqual({ kind: 'SPLITTER_PORT', id: 'p1' });
    expect(parseTraceQuery('NOPE:x')).toBeNull();
    expect(parseTraceQuery('BOX')).toBeNull();
    expect(parseTraceQuery('BOX:')).toBeNull();
    expect(parseTraceQuery(null)).toBeNull();
  });
});
