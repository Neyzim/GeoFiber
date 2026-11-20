import { MapElement } from './map-element';
import { describeView } from './view-summary';

function element(group: MapElement['group'], id: string): MapElement {
  return {
    key: `x:${id}`,
    kind: group === 'olt' ? 'olt' : group === 'customer' ? 'customer' : 'box',
    id,
    group,
    name: id,
    status: 'ACTIVE',
    position: { lat: 0, lng: 0 },
    details: [],
  };
}

describe('describeView', () => {
  it('counts what is visible, with correct plurals', () => {
    const visible = [
      element('olt', 'o1'),
      element('CTO', 'c1'),
      element('CTO', 'c2'),
      element('customer', 'k1'),
    ];
    expect(describeView({ visible, totalElements: 4, visibleCables: 1, totalCables: 1 })).toBe(
      'Você está vendo 1 OLT, 2 CTOs e 1 cliente, ligados por 1 cabo.',
    );
  });

  it('warns when filters hide part of the network', () => {
    expect(
      describeView({
        visible: [element('CEO', 'e1')],
        totalElements: 3,
        visibleCables: 0,
        totalCables: 2,
      }),
    ).toBe(
      'Você está vendo 1 CEO, sem cabos. Filtros, busca ou camadas ocultas estão escondendo 2 pontos e 2 cabos.',
    );
  });

  it('explains an empty map', () => {
    expect(describeView({ visible: [], totalElements: 0, visibleCables: 0, totalCables: 0 })).toBe(
      'A rede ainda está vazia. Use "Adicionar elemento" para cadastrar a primeira OLT ou caixa.',
    );
  });
});
