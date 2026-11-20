import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { BoxResponse } from '../api/api-types';
import { NotificationService } from '../services/notification';
import { CreateCableResult, NetworkMapRepository } from './network-map-repository';

const API = 'http://api.test/api/v1';
const A = { longitude: -46.1, latitude: -23.1 };
const box = (location = A): BoxResponse => ({ id: 'b1', name: 'CTO-01', type: 'CTO', location });
const cableBody = {
  name: 'FEEDER-01',
  role: 'FEEDER' as const,
  fiberCapacity: 12,
  coordinates: [A, { longitude: -46.2, latitude: -23.2 }],
};

describe('NetworkMapRepository', () => {
  let repo: NetworkMapRepository;
  let http: HttpTestingController;
  let apiError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
        { provide: NotificationService, useValue: { apiError } },
      ],
    });
    repo = TestBed.inject(NetworkMapRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushLoad(lists: {
    olts?: unknown[];
    boxes?: unknown[];
    customers?: unknown[];
    cables?: unknown[];
  }) {
    http.expectOne(`${API}/olts`).flush(lists.olts ?? []);
    http.expectOne(`${API}/boxes`).flush(lists.boxes ?? []);
    http.expectOne(`${API}/customers`).flush(lists.customers ?? []);
    http.expectOne(`${API}/cables`).flush(lists.cables ?? []);
  }

  it('load fills the four lists and becomes ready', () => {
    repo.load();
    expect(repo.loadState()).toBe('loading');
    flushLoad({
      olts: [{ id: 'o1', name: 'OLT', location: A }],
      boxes: [box(), { id: 'b2', name: 'sem local', type: 'CEO' }],
      customers: [{ id: 'cu1', name: 'Maria', location: A }],
    });
    expect(repo.loadState()).toBe('ready');
    expect(repo.elements().length).toBe(3);
  });

  it('load error sets state error', () => {
    repo.load();
    http.expectOne(`${API}/olts`).flush([]);
    http.expectOne(`${API}/boxes`).flush(null, { status: 500, statusText: 'x' });
    // forkJoin cancela as demais requisições ao primeiro erro.
    http.match(() => true);
    expect(repo.loadState()).toBe('error');
  });

  it('reload replaces data', () => {
    repo.load();
    flushLoad({ olts: [{ id: 'o1', name: 'OLT', location: A }] });
    repo.load();
    flushLoad({ olts: [{ id: 'o1', name: 'OLT', location: A }] });
    expect(repo.olts().length).toBe(1);
  });

  it('createBox inserts after success only', () => {
    repo.createBox({ name: 'CTO-01', type: 'CTO', location: A }).subscribe();
    expect(repo.boxes().length).toBe(0);
    http.expectOne({ method: 'POST', url: `${API}/boxes` }).flush(box());
    expect(repo.boxes().length).toBe(1);
  });

  it('createCable saves START/END', () => {
    let result: CreateCableResult | undefined;
    repo
      .createCable(cableBody, { start: { kind: 'olt', id: 'o1' }, end: { kind: 'box', id: 'b1' } })
      .subscribe((value) => (result = value));
    http.expectOne({ method: 'POST', url: `${API}/cables` }).flush({ id: 'c1', ...cableBody });
    const put = http.expectOne({ method: 'PUT', url: `${API}/cables/c1/attachments` });
    expect(put.request.body).toEqual([
      { role: 'START', oltId: 'o1' },
      { role: 'END', boxId: 'b1' },
    ]);
    put.flush([]);
    expect(result?.attachmentsSaved).toBe(true);
  });

  it('createCable keeps cable when attachments fail', () => {
    let result: CreateCableResult | undefined;
    repo
      .createCable(cableBody, { start: { kind: 'olt', id: 'o1' }, end: { kind: 'box', id: 'b1' } })
      .subscribe((value) => (result = value));
    http.expectOne({ method: 'POST', url: `${API}/cables` }).flush({ id: 'c1', ...cableBody });
    http
      .expectOne({ method: 'PUT', url: `${API}/cables/c1/attachments` })
      .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    expect(result?.attachmentsSaved).toBe(false);
    expect(repo.cables().length).toBe(1);
  });

  it('createCable skips attachments with only start', () => {
    let result: CreateCableResult | undefined;
    repo
      .createCable(cableBody, { start: { kind: 'olt', id: 'o1' } })
      .subscribe((value) => (result = value));
    http.expectOne({ method: 'POST', url: `${API}/cables` }).flush({ id: 'c1', ...cableBody });
    expect(result?.attachmentsSaved).toBeNull();
  });

  it('moveElement rolls back on error', () => {
    repo.load();
    flushLoad({ boxes: [box()] });
    repo.moveElement({ kind: 'box', id: 'b1' }, { lat: -23.9, lng: -46.9 });
    expect(repo.findBox('b1')?.location).toEqual({ longitude: -46.9, latitude: -23.9 });
    http
      .expectOne({ method: 'PUT', url: `${API}/boxes/b1` })
      .flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    expect(repo.findBox('b1')?.location).toEqual(A);
    expect(apiError).toHaveBeenCalled();
  });

  it('rollback does not overwrite a newer move', () => {
    repo.load();
    flushLoad({ boxes: [box()] });
    repo.moveElement({ kind: 'box', id: 'b1' }, { lat: -23.2, lng: -46.2 });
    repo.moveElement({ kind: 'box', id: 'b1' }, { lat: -23.3, lng: -46.3 });
    const [first, second] = http.match({ method: 'PUT', url: `${API}/boxes/b1` });
    second.flush(box({ longitude: -46.3, latitude: -23.3 }));
    first.flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    expect(repo.findBox('b1')?.location).toEqual({ longitude: -46.3, latitude: -23.3 });
  });

  it('deleteBox removes after success', () => {
    repo.load();
    flushLoad({ boxes: [box()] });
    repo.deleteBox('b1').subscribe();
    expect(repo.boxes().length).toBe(1);
    http.expectOne({ method: 'DELETE', url: `${API}/boxes/b1` }).flush(null);
    expect(repo.boxes().length).toBe(0);
  });

  it('creates, updates and deletes customers after success only', () => {
    const body = { name: 'Maria', contractCode: 'C-1', location: A };
    repo.createCustomer(body).subscribe();
    expect(repo.customers().length).toBe(0);
    http
      .expectOne({ method: 'POST', url: `${API}/customers` })
      .flush({ id: 'k1', ...body, status: 'ACTIVE' });
    expect(repo.customers().map((item) => item.id)).toEqual(['k1']);

    repo.updateCustomer('k1', { ...body, status: 'BLOCKED' }).subscribe();
    http
      .expectOne({ method: 'PUT', url: `${API}/customers/k1` })
      .flush({ id: 'k1', ...body, status: 'BLOCKED' });
    expect(repo.customers()[0].status).toBe('BLOCKED');

    repo.deleteCustomer('k1').subscribe();
    http.expectOne({ method: 'DELETE', url: `${API}/customers/k1` }).flush(null);
    expect(repo.customers().length).toBe(0);
  });
});
