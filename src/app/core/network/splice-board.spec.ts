import { CableFiberResponse, SpliceResponse } from '../api/api-types';
import { indexFibers } from './box-interior';
import {
  attachmentText,
  defaultSpliceCables,
  describeTraySummary,
  fiberPick,
  usedEnd,
} from './splice-board';

function fiber(
  id: string,
  tubeNumber: number,
  numberInTube: number,
  extra: Partial<CableFiberResponse> = {},
): CableFiberResponse {
  return {
    id,
    tubeNumber,
    tubeColor: tubeNumber === 1 ? 'GREEN' : 'YELLOW',
    numberInTube,
    absoluteNumber: (tubeNumber - 1) * 12 + numberInTube,
    color: (['GREEN', 'YELLOW', 'WHITE'] as const)[numberInTube - 1],
    status: 'AVAILABLE',
    ends: [
      { end: 'A', status: 'AVAILABLE' },
      { end: 'B', status: 'AVAILABLE' },
    ],
    ...extra,
  };
}

function linked(type: string, extra: Record<string, unknown> = {}) {
  return [
    { end: 'A' as const, status: 'AVAILABLE' as const },
    { end: 'B' as const, status: 'CONNECTED' as const, link: { type, ...extra } },
  ] as CableFiberResponse['ends'];
}

const SPLICES: SpliceResponse[] = [
  { id: 's1', trayNumber: 1, positionNumber: 2, inputFiberId: 'f1', outputFiberId: 'g1' },
  { id: 's2', trayNumber: 1, positionNumber: 5, inputFiberId: 'f2', outputFiberId: 'g2' },
  { id: 's3', trayNumber: 2, positionNumber: 1, inputFiberId: 'f3', outputFiberId: 'g3' },
  { id: 'old', trayNumber: 1, inputFiberId: 'x', outputFiberId: 'y' },
  { id: 'big', trayNumber: 1, positionNumber: 40, inputFiberId: 'x', outputFiberId: 'y' },
];

describe('splice-board', () => {
  describe('usedEnd', () => {
    it('follows the cable role in this box', () => {
      expect(usedEnd('END', 'in')).toBe('B');
      expect(usedEnd('END', 'out')).toBe('B');
      expect(usedEnd('START', 'in')).toBe('A');
      expect(usedEnd('START', 'out')).toBe('A');
      expect(usedEnd('PASS_THROUGH', 'in')).toBe('B');
      expect(usedEnd('PASS_THROUGH', 'out')).toBe('A');
      expect(usedEnd(undefined, 'in')).toBe('B');
      expect(usedEnd(undefined, 'out')).toBe('A');
    });
  });

  describe('describeTraySummary', () => {
    it('says how many splices and trays there are', () => {
      expect(describeTraySummary(5, 2)).toBe('5 fusões em 2 bandejas');
      expect(describeTraySummary(1, 1)).toBe('1 fusão em 1 bandeja');
      expect(describeTraySummary(0, 1)).toBe('Nenhuma fusão em 1 bandeja');
      expect(describeTraySummary(0, 0)).toBe('Nenhuma bandeja cadastrada');
    });
  });

  describe('fiberPick', () => {
    const index = indexFibers([
      {
        cableId: 'c1',
        name: 'CABO-01',
        fibers: [
          fiber('f1', 1, 1, { ends: linked('FUSION', { id: 's1', elementId: 'box1' }) }),
          fiber('f2', 1, 2, { ends: linked('FUSION', { id: 'zz', elementId: 'box9' }) }),
          fiber('f3', 1, 3, { ends: linked('CONNECTOR') }),
          fiber('f4', 2, 1, { ends: linked('SPLITTER_PORT') }),
          fiber('f5', 2, 2, { ends: linked('SERVICE_PORT') }),
          fiber('f6', 2, 3, { ends: linked('OLT_PORT') }),
          fiber('f7', 3, 1, { status: 'BROKEN' }),
          fiber('f8', 3, 2, { status: 'RESERVED' }),
          fiber('f9', 3, 3),
        ],
      },
    ]);
    const pick = (id: string, chosenOther?: string) =>
      fiberPick(index.get(id)!, 'B', { boxId: 'box1', splices: SPLICES, chosenOther });

    it('is free when the used end is free', () => {
      expect(pick('f9')).toEqual({ free: true, reason: null });
      expect(fiberPick(index.get('f1')!, 'A', { boxId: 'box1', splices: SPLICES })).toEqual({
        free: true,
        reason: null,
      });
    });

    it('explains why a fiber cannot be picked', () => {
      expect(pick('f1').reason).toBe('já emendada na bandeja 1, posição 2');
      expect(pick('f2').reason).toBe('emendada em outra caixa');
      expect(pick('f3').reason).toBe('ligada por conector');
      expect(pick('f4').reason).toBe('ligada a um splitter');
      expect(pick('f5').reason).toBe('ligada a uma porta de atendimento');
      expect(pick('f6').reason).toBe('ligada à OLT');
      expect(pick('f7').reason).toBe('rompida');
      expect(pick('f8').reason).toBe('reservada');
      expect(pick('f1').free).toBe(false);
    });

    it('does not let the same fiber be chosen on both sides', () => {
      expect(pick('f9', 'f9')).toEqual({ free: false, reason: 'já escolhida do outro lado' });
    });
  });

  describe('names and texts', () => {
    it('translates the attachment role', () => {
      expect(attachmentText('END')).toBe('chega aqui');
      expect(attachmentText('START')).toBe('sai daqui');
      expect(attachmentText('PASS_THROUGH')).toBe('passa por aqui');
      expect(attachmentText(undefined)).toBe('');
    });
  });

  describe('defaultSpliceCables', () => {
    it('puts the first arriving cable on the left and another cable on the right', () => {
      const cables = [
        { cableId: 'c2', attachmentRole: 'START' as const },
        { cableId: 'c1', attachmentRole: 'END' as const },
      ];
      expect(defaultSpliceCables(cables)).toEqual(['c1', 'c2']);
      expect(defaultSpliceCables([{ cableId: 'c9', attachmentRole: 'PASS_THROUGH' }])).toEqual([
        'c9',
        'c9',
      ]);
      expect(defaultSpliceCables([])).toEqual([null, null]);
    });
  });
});
