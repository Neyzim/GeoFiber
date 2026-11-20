import { computed, signal } from '@angular/core';
import {
  AttachedCableResponse,
  CableFiberResponse,
  SpliceResponse,
  TrayResponse,
} from '../app/core/api/api-types';
import { indexFibers } from '../app/core/network/box-interior';

/** Fibra de teste: tubo 1 verde / tubo 2 amarelo; cores das fibras na ordem padrão. */
export function testFiber(
  id: string,
  tubeNumber: number,
  numberInTube: number,
  extra: Partial<CableFiberResponse> = {},
): CableFiberResponse {
  const colors = ['GREEN', 'YELLOW', 'WHITE', 'BLUE'] as const;
  return {
    id,
    tubeNumber,
    tubeColor: tubeNumber === 1 ? 'GREEN' : 'YELLOW',
    numberInTube,
    absoluteNumber: (tubeNumber - 1) * 4 + numberInTube,
    color: colors[numberInTube - 1],
    status: 'AVAILABLE',
    ends: [
      { end: 'A', status: 'AVAILABLE' },
      { end: 'B', status: 'AVAILABLE' },
    ],
    ...extra,
  };
}

/** Ponta B emendada pela fusão `spliceId` desta caixa. */
export function splicedAtB(spliceId: string, boxId = 'b1'): CableFiberResponse['ends'] {
  return [
    { end: 'A', status: 'AVAILABLE' },
    { end: 'B', status: 'CONNECTED', link: { type: 'FUSION', id: spliceId, elementId: boxId } },
  ];
}

/** Ponta A emendada pela fusão `spliceId` desta caixa. */
export function splicedAtA(spliceId: string, boxId = 'b1'): CableFiberResponse['ends'] {
  return [
    { end: 'A', status: 'CONNECTED', link: { type: 'FUSION', id: spliceId, elementId: boxId } },
    { end: 'B', status: 'AVAILABLE' },
  ];
}

export interface FakeBoxData {
  cables?: AttachedCableResponse[];
  fibers?: Record<string, CableFiberResponse[]>;
  trays?: TrayResponse[];
  splices?: SpliceResponse[];
}

export const DEFAULT_CABLES: AttachedCableResponse[] = [
  { cableId: 'c2', name: 'CABO-02', attachmentRole: 'START', fiberCapacity: 8 },
  { cableId: 'c1', name: 'CABO-01', attachmentRole: 'END', fiberCapacity: 8 },
];

export const DEFAULT_SPLICES: SpliceResponse[] = [
  {
    id: 's1',
    trayNumber: 1,
    positionNumber: 2,
    inputFiberId: 'a2',
    inputFiberEnd: 'B',
    outputFiberId: 'b3',
    outputFiberEnd: 'A',
    attenuationDb: 0.05,
  },
];

export function defaultFibers(): Record<string, CableFiberResponse[]> {
  return {
    c1: [
      testFiber('a1', 1, 1),
      testFiber('a2', 1, 2, { ends: splicedAtB('s1') }),
      testFiber('a3', 1, 3, { status: 'BROKEN' }),
      testFiber('a4', 1, 4),
      testFiber('a5', 2, 1),
    ],
    c2: [testFiber('b1', 1, 1), testFiber('b3', 1, 3, { ends: splicedAtA('s1') })],
  };
}

/** Store falso com a mesma forma de leitura do `BoxSheetStore`. */
export function fakeBoxStore(data: FakeBoxData = {}) {
  const cables = data.cables ?? DEFAULT_CABLES;
  const fibers = data.fibers ?? defaultFibers();
  const overview = signal<Record<string, unknown> | null>({
    box: { id: 'b1', name: 'CEO-07', type: 'CEO', usageStatus: 'ACTIVE' },
  });
  const trays = signal<TrayResponse[]>(
    data.trays ?? [
      { id: 't1', trayNumber: 1, capacity: 6, usedPositions: 1 },
      { id: 't2', trayNumber: 2, capacity: 12, usedPositions: 0 },
    ],
  );
  const splices = signal<SpliceResponse[]>(data.splices ?? DEFAULT_SPLICES);
  return {
    boxId: signal('b1'),
    state: signal('ready'),
    overview,
    saving: signal(false),
    cables: signal(cables),
    trays,
    splices,
    fiberIndex: signal(
      indexFibers(
        cables.map((cable) => ({
          cableId: cable.cableId ?? '',
          name: cable.name ?? '',
          fibers: fibers[cable.cableId ?? ''] ?? [],
        })),
      ),
    ),
    summary: computed(() => ''),
    open: vi.fn(),
    close: vi.fn(),
    reload: vi.fn(),
    addTray: vi.fn(),
    deleteTray: vi.fn(),
    deleteSplice: vi.fn(),
    saveSplice: vi.fn(),
  };
}

export type FakeBoxStore = ReturnType<typeof fakeBoxStore>;
