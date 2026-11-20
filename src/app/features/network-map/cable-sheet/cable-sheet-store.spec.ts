import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { CableAttachmentResponse } from '../../../core/api/api-types';
import { CableApi } from '../../../core/api/resources/cable-api';
import { FiberApi } from '../../../core/api/resources/fiber-api';
import { NotificationService } from '../../../core/services/notification';
import { CableSheetStore } from './cable-sheet-store';

const olt = { ref: { kind: 'olt' as const, id: 'o1' }, name: 'OLT-CENTRO' };
const ceo = { ref: { kind: 'box' as const, id: 'b1' }, name: 'CEO-01' };

function setup() {
  const cableApi = {
    listAttachments: vi.fn(() =>
      of<CableAttachmentResponse[]>([
        { sequenceNumber: 1, role: 'START', oltId: 'o1', elementName: 'OLT-CENTRO' },
        { sequenceNumber: 2, role: 'END', boxId: 'b1', elementName: 'CEO-01' },
      ]),
    ),
    listTubes: vi.fn(() => of([{ id: 't1', tubeNumber: 1, capacity: 2, color: 'GREEN' }])),
    listFibers: vi.fn(() =>
      of([
        { id: 'f2', tubeId: 't1', numberInTube: 2, absoluteNumber: 2, status: 'AVAILABLE' },
        { id: 'f1', tubeId: 't1', numberInTube: 1, absoluteNumber: 1, status: 'AVAILABLE' },
      ]),
    ),
    setAttachments: vi.fn((_id: string, _body: unknown) => of<CableAttachmentResponse[]>([])),
    createStructure: vi.fn((_id: string, _body: unknown) => of({})),
  };
  const fiberApi = {
    setStatus: vi.fn(() => of({ id: 'f1', tubeId: 't1', numberInTube: 1, status: 'BROKEN' })),
  };
  const notifications = { apiError: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      CableSheetStore,
      { provide: CableApi, useValue: cableApi },
      { provide: FiberApi, useValue: fiberApi },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { store: TestBed.inject(CableSheetStore), cableApi, fiberApi, notifications };
}

describe('CableSheetStore', () => {
  it('loads the list, the tubes and the fibers sorted inside each tube', () => {
    const { store } = setup();
    store.open('c1');
    expect(store.state()).toBe('ready');
    expect(store.route()).toBe('Este cabo sai de OLT-CENTRO e termina em CEO-01.');
    expect(store.tubes()[0].fibers.map((fiber) => fiber.id)).toEqual(['f1', 'f2']);
  });

  it('ignores a late answer for a cable that is no longer open', () => {
    const { store, cableApi } = setup();
    const late = new Subject<CableAttachmentResponse[]>();
    cableApi.listAttachments.mockReturnValueOnce(late);
    store.open('c1');
    store.open('c2');
    late.next([{ role: 'START', elementName: 'ANTIGO' }]);
    late.complete();
    expect(store.cableId()).toBe('c2');
    expect(store.route()).not.toContain('ANTIGO');
  });

  it('saves the edited list with roles from the position', () => {
    const { store, cableApi } = setup();
    store.open('c1');
    store.startEditing();
    store.removeItem(1);
    store.addToDraft(ceo);
    store.moveItem(1, -1);
    store.saveRoute();
    expect(cableApi.setAttachments).toHaveBeenCalledWith('c1', [
      { role: 'START', boxId: 'b1' },
      { role: 'END', oltId: 'o1' },
    ]);
    expect(store.editing()).toBe(false);
  });

  it('does not send an invalid list and keeps editing', () => {
    const { store, cableApi, notifications } = setup();
    store.open('c1');
    store.startEditing();
    store.removeItem(1);
    store.saveRoute();
    expect(cableApi.setAttachments).not.toHaveBeenCalled();
    expect(notifications.warning).toHaveBeenCalledWith('Escolha pelo menos o início e o fim.');
    expect(store.editing()).toBe(true);
  });

  it('keeps the draft open when the server refuses it', () => {
    const { store, cableApi, notifications } = setup();
    cableApi.setAttachments.mockReturnValueOnce(throwError(() => new Error('409')));
    store.open('c1');
    store.startEditing();
    store.addToDraft({ ref: { kind: 'box', id: 'b9' }, name: 'CTO-09' });
    store.saveRoute();
    expect(notifications.apiError).toHaveBeenCalled();
    expect(store.editing()).toBe(true);
    expect(store.draft().map((item) => item.name)).toEqual(['OLT-CENTRO', 'CEO-01', 'CTO-09']);
  });

  it('creates the structure filling the cable capacity and reloads', () => {
    const { store, cableApi } = setup();
    store.open('c1');
    store.createStructure(24, 12);
    expect(cableApi.createStructure).toHaveBeenCalledWith('c1', {
      tubes: [
        { tubeNumber: 1, capacity: 12, color: 'GREEN' },
        { tubeNumber: 2, capacity: 12, color: 'YELLOW' },
      ],
    });
    expect(cableApi.listFibers).toHaveBeenCalledTimes(2);
  });

  it('updates the fiber status in place', () => {
    const { store, fiberApi } = setup();
    store.open('c1');
    const fiber = store.tubes()[0].fibers[0];
    store.setFiberStatus(fiber, 'BROKEN');
    expect(fiberApi.setStatus).toHaveBeenCalledWith('t1', 'f1', { status: 'BROKEN' });
    expect(store.tubes()[0].fibers[0].status).toBe('BROKEN');
  });

  it('exposes the keys of the elements in the list for the map', () => {
    const { store } = setup();
    store.open('c1');
    expect([...store.elementKeys()]).toEqual(['olt:o1', 'box:b1']);
    void olt;
  });
});
