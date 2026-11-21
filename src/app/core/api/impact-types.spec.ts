import type { ImpactBox, ImpactCustomer, ImpactKind, ImpactOlt, ImpactResponse, ImpactTarget, ImpactTotals } from './impact-types';

describe('impact-types', () => {
  it('expõe os apelidos do contrato gerado de impacto', () => {
    const kind: ImpactKind = 'cables';
    const target: ImpactTarget = {
      kind: 'CABLE',
      id: 'c1',
      label: 'CABO-01',
      coordinates: [{ longitude: -51.57, latitude: -10.65 }, { longitude: -51.58, latitude: -10.66 }],
    };
    const customer: ImpactCustomer = { id: 'k1', name: 'Maria', coordinates: null as never };
    const box: ImpactBox = { id: 'b1', label: 'CTO-002', customers: [customer] };
    const olt: ImpactOlt = { id: 'o1', label: 'OLT-CENTRAL' };
    const totals: ImpactTotals = { customers: 1, boxes: 1, olts: 1 };
    const response: ImpactResponse = { target, totals, boxes: [box], olts: [olt], truncated: false };

    expect(kind).toBe('cables');
    expect(response.target?.kind).toBe('CABLE');
    expect(response.boxes?.[0].customers?.[0].name).toBe('Maria');
  });
});
