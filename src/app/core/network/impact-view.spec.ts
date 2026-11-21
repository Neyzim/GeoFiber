import type { ImpactResponse } from '../api/impact-types';
import { impactMarkers, impactTargetPath, summaryLine, totalsLine, truncatedNote } from './impact-view';

const at = (longitude: number, latitude: number) => ({ longitude, latitude });

describe('impact-view', () => {
  it('resume o impacto de um cabo, com singular e plural', () => {
    const many: ImpactResponse = { target: { kind: 'CABLE' }, totals: { customers: 12, boxes: 3, olts: 1 } };
    const one: ImpactResponse = { target: { kind: 'CABLE' }, totals: { customers: 1, boxes: 1, olts: 0 } };

    expect(summaryLine(many)).toBe('Se este cabo sair, 12 clientes ficam sem sinal, em 3 caixas.');
    expect(summaryLine(one)).toBe('Se este cabo sair, 1 cliente fica sem sinal, em 1 caixa.');
  });

  it('usa "parar" para caixa e OLT', () => {
    const box: ImpactResponse = { target: { kind: 'BOX' }, totals: { customers: 4, boxes: 0, olts: 0 } };
    const olt: ImpactResponse = { target: { kind: 'OLT' }, totals: { customers: 4, boxes: 2, olts: 0 } };

    expect(summaryLine(box)).toBe('Se esta caixa parar, 4 clientes ficam sem sinal.');
    expect(summaryLine(olt)).toBe('Se esta OLT parar, 4 clientes ficam sem sinal, em 2 caixas.');
  });

  it('sem clientes, diz que nenhum depende do item', () => {
    const none: ImpactResponse = { target: { kind: 'CABLE' }, totals: { customers: 0, boxes: 0, olts: 0 } };
    expect(summaryLine(none)).toBe('Nenhum cliente depende deste item.');
  });

  it('mostra as contagens em uma linha', () => {
    expect(totalsLine({ customers: 12, boxes: 3, olts: 1 })).toBe('12 clientes · 3 caixas · 1 OLT');
    expect(totalsLine({ customers: 1, boxes: 1, olts: 2 })).toBe('1 cliente · 1 caixa · 2 OLTs');
  });

  it('avisa quando a lista foi cortada e mantém o total real', () => {
    const cut: ImpactResponse = { totals: { customers: 2001, boxes: 1, olts: 0 }, truncated: true };
    const full: ImpactResponse = { totals: { customers: 5, boxes: 1, olts: 0 }, truncated: false };

    expect(truncatedNote(cut)).toBe('Mostrando os primeiros 2000 clientes; o total é 2001.');
    expect(truncatedNote(full)).toBeNull();
  });

  it('marca caixas, clientes e OLTs com posição; deixa de fora quem não tem posição', () => {
    const response: ImpactResponse = {
      target: { kind: 'CABLE' },
      boxes: [
        {
          id: 'b1',
          label: 'CTO-002',
          coordinates: [at(-51.57, -10.65)],
          customers: [
            { id: 'k1', name: 'Maria', coordinates: [at(-51.571, -10.651)] },
            { id: 'k2', name: 'João', coordinates: null as never },
          ],
        },
        { id: 'b2', label: 'CTO-003', coordinates: null as never, customers: [] },
      ],
      olts: [{ id: 'o1', label: 'OLT-CENTRAL', coordinates: [at(-51.56, -10.64)] }],
    };
    const markers = impactMarkers(response);

    expect(markers.map((m) => [m.kind, m.label])).toEqual([
      ['box', 'CTO-002'],
      ['customer', 'Maria'],
      ['olt', 'OLT-CENTRAL'],
    ]);
    expect(markers[1].point).toEqual({ lat: -10.651, lng: -51.571 });
  });

  it('desenha o traçado do cabo alvo em destaque; caixa não tem traçado', () => {
    const cable: ImpactResponse = {
      target: { kind: 'CABLE', coordinates: [at(-51.57, -10.65), at(-51.58, -10.66)] },
    };
    const box: ImpactResponse = { target: { kind: 'BOX', coordinates: [at(-51.57, -10.65)] } };

    const path = impactTargetPath(cable);
    expect(path?.points).toEqual([
      { lat: -10.65, lng: -51.57 },
      { lat: -10.66, lng: -51.58 },
    ]);
    expect(path?.color).toBe('#7b1fa2');
    expect(path?.emphasis).toBe(true);
    expect(impactTargetPath(box)).toBeNull();
  });
});
