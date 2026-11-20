import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { BoxOverviewResponse } from '../../../core/api/api-types';
import { BoxApi } from '../../../core/api/resources/box-api';
import { CableApi } from '../../../core/api/resources/cable-api';
import { ConnectionApi } from '../../../core/api/resources/connection-api';
import { ServicePortApi } from '../../../core/api/resources/service-port-api';
import { SpliceApi } from '../../../core/api/resources/splice-api';
import { SplitterApi } from '../../../core/api/resources/splitter-api';
import { TrayApi } from '../../../core/api/resources/tray-api';
import { NotificationService } from '../../../core/services/notification';
import { BoxSheetStore } from './box-sheet-store';

const overview: BoxOverviewResponse = {
  box: { id: 'b1', name: 'CTO-01', type: 'CTO' },
  cables: [{ cableId: 'c1', name: 'CABO-01' }],
  trays: [{ id: 't1', trayNumber: 1, capacity: 12 }],
  splitters: [
    {
      id: 'sp1',
      ratio: 'RATIO_1_2',
      ports: [
        { id: 'in', portNumber: 1, direction: 'INPUT', attenuationDb: 0.3 },
        { id: 'o1', portNumber: 2, direction: 'OUTPUT' },
      ],
    },
  ],
  servicePorts: [{ id: 'sv1', portNumber: 3, label: 'P3' }],
};

function setup() {
  const boxApi = { overview: vi.fn((_id: string) => of(overview)) };
  const cableApi = {
    listFibers: vi.fn(() => of([{ id: 'f1', tubeNumber: 1, numberInTube: 1, absoluteNumber: 1 }])),
  };
  const ok = () => vi.fn((..._args: unknown[]) => of({}));
  const trayApi = { create: ok(), delete: ok() };
  const spliceApi = { create: ok(), delete: ok() };
  const connectionApi = { create: ok(), delete: ok() };
  const splitterApi = { create: ok(), delete: ok(), updatePort: ok() };
  const servicePortApi = { create: ok(), update: ok(), delete: ok() };
  const notifications = { apiError: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      BoxSheetStore,
      { provide: BoxApi, useValue: boxApi },
      { provide: CableApi, useValue: cableApi },
      { provide: TrayApi, useValue: trayApi },
      { provide: SpliceApi, useValue: spliceApi },
      { provide: ConnectionApi, useValue: connectionApi },
      { provide: SplitterApi, useValue: splitterApi },
      { provide: ServicePortApi, useValue: servicePortApi },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    store: TestBed.inject(BoxSheetStore),
    boxApi,
    cableApi,
    trayApi,
    spliceApi,
    splitterApi,
    servicePortApi,
  };
}

describe('BoxSheetStore', () => {
  it('loads the overview and the fibers of each cable', () => {
    const { store, cableApi } = setup();
    store.open('b1');
    expect(store.state()).toBe('ready');
    expect(cableApi.listFibers).toHaveBeenCalledWith('c1');
    expect(store.fiberIndex().get('f1')?.cableName).toBe('CABO-01');
    expect(store.summary()).toContain('Esta caixa recebe 1 cabo.');
  });

  it('ignores the answer of a box that is no longer open', () => {
    const { store, boxApi } = setup();
    const late = new Subject<BoxOverviewResponse>();
    boxApi.overview.mockReturnValueOnce(late);
    store.open('b1');
    store.open('b2');
    late.next({ box: { id: 'b1', name: 'ANTIGA' } });
    expect(store.overview()?.box?.name).toBe('CTO-01');
  });

  it('adds the next tray and reloads', () => {
    const { store, trayApi, boxApi } = setup();
    store.open('b1');
    store.addTray(12);
    expect(trayApi.create).toHaveBeenCalledWith('b1', { trayNumber: 2, capacity: 12 });
    expect(boxApi.overview).toHaveBeenCalledTimes(2);
  });

  it('creates a splice', () => {
    const { store, spliceApi } = setup();
    store.open('b1');
    const body = { trayNumber: 1, inputFiberId: 'f1', outputFiberId: 'f2' };
    store.addSplice(body);
    expect(spliceApi.create).toHaveBeenCalledWith('b1', body);
  });

  it('links a splitter port keeping its attenuation, and unlinks it', () => {
    const { store, splitterApi } = setup();
    store.open('b1');
    const input = store.overview()!.splitters![0].ports![0];
    store.linkSplitterPort('sp1', input, { fiberId: 'f1', fiberEnd: 'B' });
    expect(splitterApi.updatePort).toHaveBeenCalledWith('sp1', 'in', {
      attenuationDb: 0.3,
      fiberId: 'f1',
      fiberEnd: 'B',
    });
    store.linkSplitterPort('sp1', input, null);
    expect(splitterApi.updatePort).toHaveBeenLastCalledWith('sp1', 'in', { attenuationDb: 0.3 });
  });

  it('gives a new service port the next number', () => {
    const { store, servicePortApi } = setup();
    store.open('b1');
    store.addServicePort({ label: 'Casa', splitterPortId: 'o1' });
    expect(servicePortApi.create).toHaveBeenCalledWith('b1', {
      portNumber: 4,
      label: 'Casa',
      splitterPortId: 'o1',
    });
  });

  it('changes the source of a service port keeping number and label', () => {
    const { store, servicePortApi } = setup();
    store.open('b1');
    store.setServicePortSource(store.overview()!.servicePorts![0], { fiberId: 'f1', fiberEnd: 'B' });
    expect(servicePortApi.update).toHaveBeenCalledWith('b1', 'sv1', {
      portNumber: 3,
      label: 'P3',
      fiberId: 'f1',
      fiberEnd: 'B',
    });
  });
});
