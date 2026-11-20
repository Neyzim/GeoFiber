import { BoxOverviewResponse, CableFiberResponse } from '../api/api-types';
import {
  connectorMiddle,
  describeBoxSummary,
  describeDiagramEnd,
  describeDiagramMiddle,
  diagramEnd,
  spliceMiddle,
  describeServicePortSource,
  fiberLabel,
  fiberOptions,
  indexFibers,
  nextNumber,
  outputNumber,
  splitterLabel,
} from './box-interior';

const fibers: CableFiberResponse[] = [
  {
    id: 'f1',
    tubeId: 't1',
    tubeNumber: 1,
    tubeColor: 'GREEN',
    numberInTube: 3,
    absoluteNumber: 3,
    color: 'WHITE',
    status: 'AVAILABLE',
    ends: [
      { end: 'A', status: 'AVAILABLE' },
      { end: 'B', status: 'AVAILABLE' },
    ],
  },
  {
    id: 'f2',
    tubeId: 't1',
    tubeNumber: 1,
    tubeColor: 'GREEN',
    numberInTube: 1,
    absoluteNumber: 1,
    color: 'GREEN',
    status: 'OCCUPIED',
    ends: [
      { end: 'A', status: 'CONNECTED', link: { type: 'FUSION', id: 's1', elementId: 'b1' } },
      { end: 'B', status: 'AVAILABLE' },
    ],
  },
  { id: 'f3', tubeId: 't1', tubeNumber: 1, numberInTube: 2, absoluteNumber: 2, status: 'BROKEN' },
];

const index = indexFibers([{ cableId: 'c1', name: 'CABO-01', fibers }]);

describe('fiber labels', () => {
  it('names a fiber by cable, tube and color', () => {
    expect(fiberLabel(index.get('f1'))).toBe('CABO-01, tubo 1 (Verde), fibra 3 (Branco)');
    expect(fiberLabel(undefined)).toBe('Fibra de outro cabo');
  });
});

describe('fiberOptions', () => {
  it('lists only fibers whose chosen end is free and that are usable', () => {
    expect(fiberOptions(index, 'A').map((option) => option.id)).toEqual(['f1']);
    expect(fiberOptions(index, 'B').map((option) => option.id)).toEqual(['f2', 'f1']);
  });

  it('keeps an already chosen fiber in the list', () => {
    expect(fiberOptions(index, 'A', 'f2').map((option) => option.id)).toEqual(['f2', 'f1']);
  });
});

describe('splitters', () => {
  it('labels the ratio and numbers outputs from 1', () => {
    expect(splitterLabel({ ratio: 'RATIO_1_8', balanced: true })).toBe('Splitter 1:8 (balanceado)');
    expect(splitterLabel({ ratio: 'RATIO_1_2', balanced: false })).toBe(
      'Splitter 1:2 (desbalanceado)',
    );
    expect(outputNumber({ portNumber: 2 })).toBe(1);
  });
});

describe('describeServicePortSource', () => {
  const splitters = [
    {
      id: 'sp1',
      ratio: 'RATIO_1_8' as const,
      balanced: true,
      ports: [{ id: 'p3', portNumber: 4, direction: 'OUTPUT' as const }],
    },
  ];

  it('explains where the signal comes from', () => {
    expect(describeServicePortSource({ splitterPortId: 'p3' }, splitters, index)).toBe(
      'Recebe sinal do Splitter 1:8 (balanceado), saída 3',
    );
    expect(describeServicePortSource({ fiberId: 'f1' }, splitters, index)).toBe(
      'Ligada direto a CABO-01, tubo 1 (Verde), fibra 3 (Branco)',
    );
    expect(describeServicePortSource({}, splitters, index)).toBe('Sem sinal: nada ligado');
  });
});

describe('describeBoxSummary', () => {
  it('explains an empty box', () => {
    expect(describeBoxSummary({})).toBe('Nada foi registrado dentro desta caixa ainda.');
  });

  it('mentions only what exists', () => {
    const overview: BoxOverviewResponse = {
      cables: [{ cableId: 'c1' }, { cableId: 'c2' }],
      splices: [{ id: 's1' }],
      splitters: [{ id: 'sp1' }],
      servicePorts: [{ id: 'a', customerId: 'x' }, { id: 'b' }],
    };
    expect(describeBoxSummary(overview)).toBe(
      'Esta caixa recebe 2 cabos. Tem 1 fusão, 1 splitter e 2 portas de atendimento (1 com cliente).',
    );
  });

  it('handles cables only', () => {
    expect(describeBoxSummary({ cables: [{ cableId: 'c1' }] })).toBe(
      'Esta caixa recebe 1 cabo. Ainda não há ligações registradas dentro dela.',
    );
  });
});

describe('nextNumber', () => {
  it('returns one above the highest', () => {
    expect(nextNumber([])).toBe(1);
    expect(nextNumber([1, 4, 2])).toBe(5);
  });
});

describe('diagrama de emenda', () => {
  it('formats attenuation with pt-BR locale', () => {
    expect(spliceMiddle({ positionNumber: 3, attenuationDb: 0.05 })).toEqual({
      type: 'splice',
      positionNumber: 3,
      label: '0,05 dB',
    });
  });

  it('spliceMiddle without attenuation has no label', () => {
    expect(spliceMiddle({ positionNumber: 2 }).label).toBeUndefined();
  });

  it('connectorMiddle returns connector type', () => {
    expect(connectorMiddle()).toEqual({ type: 'connector', label: 'Conector' });
  });

  it('describeDiagramMiddle joins position and attenuation', () => {
    expect(describeDiagramMiddle({ type: 'splice', positionNumber: 5, label: '0,05 dB' })).toBe(
      'Posição 5 · 0,05 dB',
    );
    expect(describeDiagramMiddle({ type: 'splice', positionNumber: 5, attenuationDb: 0.1 })).toBe(
      'Posição 5 · 0,10 dB',
    );
    expect(describeDiagramMiddle({ type: 'connector' })).toBe('Conector');
    expect(describeDiagramMiddle(undefined)).toBe('');
  });

  it('diagramEnd maps a fiber of the box', () => {
    const info = indexFibers([{ cableId: 'c1', name: 'CABO-01', fibers }]).get('f1');
    expect(diagramEnd(info)).toEqual({
      cable: 'CABO-01',
      tubeColor: 'GREEN',
      tubeNumber: 1,
      fiberColor: 'WHITE',
      fiberNumber: 3,
    });
    expect(diagramEnd(undefined)).toBeUndefined();
  });

  it('describeDiagramEnd uses color names, not backend codes', () => {
    expect(
      describeDiagramEnd(
        { cable: 'CABO-01', tubeColor: 'GREEN', tubeNumber: 1, fiberColor: 'WHITE', fiberNumber: 3 },
        'entrada',
      ),
    ).toBe('Entrada: CABO-01, tubo 1 (Verde), fibra 3 (Branco)');
    expect(describeDiagramEnd(undefined, 'saída')).toBe('Saída: nada ligado');
  });
});
