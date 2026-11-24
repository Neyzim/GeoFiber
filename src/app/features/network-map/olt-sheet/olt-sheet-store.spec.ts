import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { OltPortResponse } from '../../../core/api/api-types';
import { CableApi } from '../../../core/api/resources/cable-api';
import { OltApi } from '../../../core/api/resources/olt-api';
import { NotificationService } from '../../../core/services/notification';
import { OltSheetStore } from './olt-sheet-store';

const ports: OltPortResponse[] = [
  { id: 'p1', slotNumber: 1, portNumber: 1, status: 'FREE' },
  { id: 'p2', slotNumber: 1, portNumber: 2, status: 'OCCUPIED', fiberId: 'f1', fiberEnd: 'A' },
];

function setup() {
  const oltApi = {
    listPorts: vi.fn((_id: string) => of(ports)),
    listCables: vi.fn(() => of([{ cableId: 'c1', name: 'CABO-01' }])),
    createPort: vi.fn((_id: string, body: unknown) => of(body)),
    updatePort: vi.fn((..._args: unknown[]) => of({})),
    deletePort: vi.fn((..._args: unknown[]) => of(undefined)),
  };
  const cableApi = {
    listFibers: vi.fn(() => of([{ id: 'f1', tubeNumber: 1, numberInTube: 1, absoluteNumber: 1 }])),
  };
  const notifications = { apiError: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      OltSheetStore,
      { provide: OltApi, useValue: oltApi },
      { provide: CableApi, useValue: cableApi },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { store: TestBed.inject(OltSheetStore), oltApi, notifications };
}

describe('OltSheetStore', () => {
  it('loads ports, cables and their fibers', () => {
    const { store } = setup();
    store.open('o1');
    expect(store.state()).toBe('ready');
    expect(store.slots()[0].ports.map((port) => port.id)).toEqual(['p1', 'p2']);
    expect(store.fiberIndex().get('f1')?.cableName).toBe('CABO-01');
    expect(store.summary()).toBe('Esta OLT tem 2 portas PON (1 em uso). 1 cabo sai dela.');
  });

  it('ignores the answer of an OLT that is no longer open', () => {
    const { store, oltApi } = setup();
    const late = new Subject<OltPortResponse[]>();
    oltApi.listPorts.mockReturnValueOnce(late);
    store.open('o1');
    store.open('o2');
    late.next([]);
    expect(store.ports()).toHaveLength(2);
  });

  it('creates a batch of ports one after the other, continuing the slot numbering', () => {
    const { store, oltApi } = setup();
    store.open('o1');
    store.addPorts(1, 2);
    expect(oltApi.createPort.mock.calls.map((call) => call[1])).toEqual([
      { slotNumber: 1, portNumber: 3 },
      { slotNumber: 1, portNumber: 4 },
    ]);
    expect(oltApi.listPorts).toHaveBeenCalledTimes(2);
  });

  it('stops the batch at the first failure and reloads', () => {
    const { store, oltApi, notifications } = setup();
    store.open('o1');
    oltApi.createPort.mockReturnValueOnce(throwError(() => new Error('409')));
    store.addPorts(1, 3);
    expect(oltApi.createPort).toHaveBeenCalledTimes(1);
    expect(notifications.apiError).toHaveBeenCalled();
    expect(oltApi.listPorts).toHaveBeenCalledTimes(2);
  });

  it('reports the batch progress while creating ports', () => {
    const { store, oltApi } = setup();
    store.open('o1');
    const answers = [new Subject<unknown>(), new Subject<unknown>(), new Subject<unknown>()];
    answers.forEach((answer) => oltApi.createPort.mockReturnValueOnce(answer));
    store.addPorts(1, 3);
    expect(store.batchProgress()).toEqual({ done: 0, total: 3 });
    answers[0].next({});
    answers[0].complete();
    expect(store.batchProgress()).toEqual({ done: 1, total: 3 });
    answers[1].next({});
    answers[1].complete();
    answers[2].next({});
    answers[2].complete();
    expect(store.batchProgress()).toBeNull();
  });

  it('clears the batch progress when a port fails', () => {
    const { store, oltApi } = setup();
    store.open('o1');
    oltApi.createPort.mockReturnValueOnce(throwError(() => new Error('409')));
    store.addPorts(1, 3);
    expect(store.batchProgress()).toBeNull();
  });

  it('links and unlinks a fiber keeping slot and number', () => {
    const { store, oltApi } = setup();
    store.open('o1');
    store.linkPort(ports[0], { fiberId: 'f1', fiberEnd: 'A' });
    expect(oltApi.updatePort).toHaveBeenCalledWith('o1', 'p1', {
      slotNumber: 1,
      portNumber: 1,
      fiberId: 'f1',
      fiberEnd: 'A',
    });
    store.linkPort(ports[1], null);
    expect(oltApi.updatePort).toHaveBeenLastCalledWith('o1', 'p2', { slotNumber: 1, portNumber: 2 });
  });

  it('sets the manual status of a free port', () => {
    const { store, oltApi } = setup();
    store.open('o1');
    store.setPortStatus(ports[0], 'FAULTY');
    expect(oltApi.updatePort).toHaveBeenCalledWith('o1', 'p1', {
      slotNumber: 1,
      portNumber: 1,
      status: 'FAULTY',
    });
  });
});
