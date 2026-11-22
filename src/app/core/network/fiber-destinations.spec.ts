import { BoxOverviewResponse, CableFiberResponse } from '../api/api-types';
import { indexFibers } from './box-interior';
import { boxFiberMap, boxSplitters, splitterShort } from './fiber-destinations';

type Fiber = CableFiberResponse;

function fiber(id: string, n: number, color: Fiber['color'], ends: Fiber['ends'] = [], status: Fiber['status'] = 'AVAILABLE'): Fiber {
  return { id, tubeNumber: 1, tubeColor: 'GREEN', numberInTube: n, absoluteNumber: n, color, status, ends };
}

const link = (type: 'FUSION' | 'SPLITTER_PORT' | 'SERVICE_PORT' | 'CONNECTOR' | 'OLT_PORT', id: string) => ({
  type,
  id,
  elementId: 'box1',
});

function build(extra: { c1?: Fiber[]; c2?: Fiber[] } = {}) {
  const c1 = extra.c1 ?? [
    fiber('c1f1', 1, 'GREEN', [{ end: 'B', status: 'CONNECTED', link: link('FUSION', 's1') }]),
    fiber('c1f2', 2, 'YELLOW', [{ end: 'B', status: 'CONNECTED', link: link('SPLITTER_PORT', 'sp1-1') }]),
  ];
  const c2 = extra.c2 ?? [
    fiber('c2f1', 1, 'GREEN', [{ end: 'A', status: 'CONNECTED', link: link('FUSION', 's1') }]),
    fiber('c2f2', 2, 'YELLOW'),
  ];
  const overview: BoxOverviewResponse = {
    box: { id: 'box1', name: 'CTO-01', type: 'CTO' },
    cables: [
      { cableId: 'c2', name: 'BACKBONE', attachmentRole: 'PASS_THROUGH', fiberCapacity: 2 },
      { cableId: 'c1', name: 'CABO-01', attachmentRole: 'END', fiberCapacity: 2 },
    ],
    trays: [{ trayNumber: 1, capacity: 12, usedPositions: 1 }],
    splices: [
      { id: 's1', trayNumber: 1, positionNumber: 3, inputFiberId: 'c1f1', inputFiberEnd: 'B', outputFiberId: 'c2f1', outputFiberEnd: 'A' },
    ],
    splitters: [
      {
        id: 'sp1',
        ratio: 'RATIO_1_16',
        balanced: true,
        ports: [
          { id: 'sp1-1', portNumber: 1, direction: 'INPUT', fiberId: 'c1f2', fiberEnd: 'B' },
          { id: 'sp1-2', portNumber: 2, direction: 'OUTPUT', servicePortId: 'p1' },
          { id: 'sp1-3', portNumber: 3, direction: 'OUTPUT' },
        ],
      },
    ],
    servicePorts: [{ id: 'p1', portNumber: 1, splitterPortId: 'sp1-2', status: 'OCCUPIED', customerId: 'k1' }],
    connections: [],
    customers: [{ id: 'k1', name: 'Maria', servicePortId: 'p1' }],
  } as BoxOverviewResponse;
  const index = indexFibers([
    { cableId: 'c1', name: 'CABO-01', fibers: c1 },
    { cableId: 'c2', name: 'BACKBONE', fibers: c2 },
  ]);
  return { overview, index };
}

describe('fiber-destinations', () => {
  it('ordena cabos que chegam, passam e saem, com tubos e fibras em ordem', () => {
    const { overview, index } = build();
    const map = boxFiberMap(overview, index);
    expect(map.map((c) => [c.name, c.roleText])).toEqual([
      ['CABO-01', 'chega aqui'],
      ['BACKBONE', 'passa por aqui'],
    ]);
    expect(map[0].tubes[0].rows.map((r) => r.fiber.numberInTube)).toEqual([1, 2]);
  });

  it('fusão desta caixa aponta a outra fibra pelo cabo, cor do tubo e número', () => {
    const { overview, index } = build();
    const row = boxFiberMap(overview, index)[0].tubes[0].rows[0];
    expect(row.end).toBe('B');
    expect(row.destination).toMatchObject({
      kind: 'splice',
      spliceId: 's1',
      otherFiberId: 'c2f1',
      text: '→ BACKBONE · Verde 1',
    });
  });

  it('entrada do splitter e porta de atendimento com cliente', () => {
    const { overview, index } = build();
    const row = boxFiberMap(overview, index)[0].tubes[0].rows[1];
    expect(row.destination).toMatchObject({ kind: 'splitter-in', splitterId: 'sp1', text: '→ Splitter 1:16' });

    const [splitter] = boxSplitters(overview, index);
    expect(splitter.label).toBe('Splitter 1:16');
    expect(splitter.inputText).toBe('CABO-01 · Verde 2');
    expect(splitter.outputs[0]).toEqual({ number: 1, used: true, text: 'porta 1', customer: 'Maria' });
    expect(splitter.outputs[1]).toEqual({ number: 2, used: false, text: 'livre' });
    expect(splitterShort({ ratio: 'RATIO_1_8' })).toBe('Splitter 1:8');
  });

  it('cabo que passa sem ligação aqui fica "passa direto"; a ponta ligada vale para o que passa', () => {
    const { overview, index } = build();
    const backbone = boxFiberMap(overview, index)[1].tubes[0].rows;
    expect(backbone[0].end).toBe('A');
    expect(backbone[1].destination).toEqual({ kind: 'pass-through', text: 'passa direto' });
    expect(backbone[1].end).toBe('B');
  });

  it('cabo que chega sem ligação aqui fica "livre"', () => {
    const { overview, index } = build({ c1: [fiber('c1f1', 1, 'GREEN')] });
    expect(boxFiberMap(overview, index)[0].tubes[0].rows[0].destination).toEqual({ kind: 'free', text: 'livre' });
  });

  it('rompida, reservada e ligação fora desta caixa', () => {
    const { overview, index } = build({
      c1: [
        fiber('a', 1, 'GREEN', [], 'BROKEN'),
        fiber('b', 2, 'YELLOW', [], 'RESERVED'),
        fiber('c', 3, 'WHITE', [{ end: 'B', status: 'CONNECTED', link: { type: 'FUSION', id: 'outra', elementId: 'box9' } }]),
        fiber('d', 4, 'BLUE', [{ end: 'B', status: 'CONNECTED', link: { type: 'OLT_PORT', id: 'pon', elementId: 'olt1' } }]),
      ],
    });
    const rows = boxFiberMap(overview, index)[0].tubes[0].rows;
    expect(rows.map((r) => r.destination)).toEqual([
      { kind: 'broken', text: 'rompida' },
      { kind: 'reserved', text: 'reservada' },
      { kind: 'elsewhere', text: 'em outra caixa' },
      { kind: 'elsewhere', text: 'ligada à OLT' },
    ]);
  });

  it('conector e porta de atendimento ligados direto à fibra', () => {
    const { overview, index } = build({
      c1: [
        fiber('a', 1, 'GREEN', [{ end: 'B', status: 'CONNECTED', link: link('CONNECTOR', 'cx1') }]),
        fiber('b', 2, 'YELLOW', [{ end: 'B', status: 'CONNECTED', link: link('SERVICE_PORT', 'p1') }]),
      ],
    });
    overview.connections = [{ id: 'cx1', type: 'CONNECTOR', fiberAId: 'a', fiberAEnd: 'B', fiberBId: 'c2f2', fiberBEnd: 'A' }];
    const rows = boxFiberMap(overview, index)[0].tubes[0].rows;
    expect(rows[0].destination).toMatchObject({ kind: 'connector', connectionId: 'cx1', otherFiberId: 'c2f2', text: '→ conector' });
    expect(rows[1].destination).toMatchObject({ kind: 'service-port', servicePortId: 'p1', text: '→ porta 1 · Maria' });
  });

  it('conta as fibras usadas por tubo', () => {
    const { overview, index } = build();
    expect(boxFiberMap(overview, index)[0].tubes[0]).toMatchObject({ number: 1, color: 'GREEN', used: 2, total: 2 });
    expect(boxFiberMap(overview, index)[1].tubes[0]).toMatchObject({ used: 1, total: 2 });
  });

  it('cabo sem fibras no índice vem vazio', () => {
    const { overview, index } = build();
    overview.cables = [...(overview.cables ?? []), { cableId: 'c3', name: 'DROP', attachmentRole: 'START' }];
    const last = boxFiberMap(overview, index).at(-1);
    expect(last).toMatchObject({ cableId: 'c3', roleText: 'sai daqui', empty: true, tubes: [] });
  });
});
