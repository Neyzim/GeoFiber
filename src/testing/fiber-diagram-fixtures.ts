import { FiberInfo } from '../app/core/network/box-interior';
import { CableView, FiberDestination, FiberRow, SplitterView } from '../app/core/network/fiber-destinations';

/** Fibra de teste para a lista do diagrama. */
export function info(id: string, cableId: string, cableName: string, tube: number, n: number, color: FiberInfo['color']): FiberInfo {
  return {
    id,
    cableId,
    cableName,
    tubeNumber: tube,
    tubeColor: tube === 1 ? 'GREEN' : 'YELLOW',
    numberInTube: n,
    absoluteNumber: (tube - 1) * 12 + n,
    color,
    status: 'AVAILABLE',
    ends: [],
  };
}

export function row(fiber: FiberInfo, destination: FiberDestination, end: 'A' | 'B' = 'B'): FiberRow {
  return { fiber, end, destination };
}

export const F1 = info('c1f1', 'c1', 'CABO-01', 1, 1, 'GREEN');
export const F2 = info('c1f2', 'c1', 'CABO-01', 1, 2, 'YELLOW');
export const F3 = info('c1f3', 'c1', 'CABO-01', 2, 1, 'GREEN');
export const B1 = info('c2f1', 'c2', 'BACKBONE', 1, 1, 'GREEN');

export function diagramCables(): CableView[] {
  return [
    {
      cableId: 'c1',
      name: 'CABO-01',
      role: 'END',
      roleText: 'chega aqui',
      empty: false,
      tubes: [
        {
          number: 1,
          color: 'GREEN',
          used: 1,
          total: 2,
          rows: [
            row(F1, { kind: 'splice', spliceId: 's1', otherFiberId: 'c2f1', text: '→ BACKBONE · Verde 1' }),
            row(F2, { kind: 'free', text: 'livre' }),
          ],
        },
        { number: 2, color: 'YELLOW', used: 0, total: 1, rows: [row(F3, { kind: 'free', text: 'livre' })] },
      ],
    },
    {
      cableId: 'c2',
      name: 'BACKBONE',
      role: 'PASS_THROUGH',
      roleText: 'passa por aqui',
      empty: false,
      tubes: [
        {
          number: 1,
          color: 'GREEN',
          used: 1,
          total: 1,
          rows: [row(B1, { kind: 'splice', spliceId: 's1', otherFiberId: 'c1f1', text: '→ CABO-01 · Verde 1' }, 'A')],
        },
      ],
    },
    { cableId: 'c3', name: 'DROP', role: 'START', roleText: 'sai daqui', empty: true, tubes: [] },
  ];
}

export const SPLITTER: SplitterView = {
  id: 'sp1',
  label: 'Splitter 1:16',
  inputText: 'CABO-01 · Verde 2',
  outputs: [
    { number: 1, used: true, text: 'porta 1', customer: 'Maria' },
    { number: 2, used: false, text: 'livre' },
  ],
};
