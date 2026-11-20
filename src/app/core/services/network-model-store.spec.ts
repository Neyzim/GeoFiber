import { TestBed } from '@angular/core/testing';
import { NETWORK_MODELS_STORAGE_KEY } from '../constants/map.constants';
import { NetworkModel, networkModelSummary, normalizeModel } from '../models/network-model.model';
import { NetworkModelStoreService } from './network-model-store';

const stamps = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('normalizeModel', () => {
  it('converts the legacy CTO splitter into service ports and drops the color', () => {
    const model = normalizeModel({
      id: 'm',
      kind: 'cto',
      name: 'CTO 1x8',
      code: 'CTO-08',
      ports: '1x8',
      color: '#fff',
      ...stamps,
    });
    expect(model?.powerCapacity).toBe(8);
    expect(model && 'color' in model).toBe(false);
    expect(model && 'code' in model).toBe(false);
  });

  it('converts the legacy cable category and fibers', () => {
    const model = normalizeModel({
      id: 'c',
      kind: 'cabo',
      name: 'Alimentação',
      category: 'alimentacao',
      fibers: 12,
      ...stamps,
    });
    expect(model?.role).toBe('FEEDER');
    expect(model?.fiberCapacity).toBe(12);
  });

  it('drops the legacy CEO splices without inventing trays', () => {
    const model = normalizeModel({ id: 'e', kind: 'ceo', name: 'CEO', splices: 24, ...stamps });
    expect(model).not.toBeNull();
    expect(model?.trayCapacity).toBeUndefined();
    expect(model && 'splices' in model).toBe(false);
  });

  it('rejects entries without id, name or a known kind', () => {
    expect(normalizeModel({ id: 'x', kind: 'olt', name: 'X' })).toBeNull();
    expect(normalizeModel({ kind: 'cto', name: 'X' })).toBeNull();
    expect(normalizeModel('nope')).toBeNull();
  });
});

describe('networkModelSummary', () => {
  const base = { id: 'm', name: 'M', description: '', ...stamps };

  it('describes each kind in plain language', () => {
    expect(networkModelSummary({ ...base, kind: 'cto', powerCapacity: 8 })).toBe(
      '8 portas de atendimento',
    );
    expect(networkModelSummary({ ...base, kind: 'ceo', trayCapacity: 2 })).toBe('2 bandejas');
    expect(
      networkModelSummary({ ...base, kind: 'cabo', role: 'FEEDER', fiberCapacity: 12 }),
    ).toBe('Alimentação · 12 fibras');
  });
});

describe('NetworkModelStoreService', () => {
  beforeEach(() => localStorage.removeItem(NETWORK_MODELS_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(NETWORK_MODELS_STORAGE_KEY));

  it('seeds the shortcuts on first use', () => {
    const store = TestBed.inject(NetworkModelStoreService);
    expect(store.byKind('cto')().map((m: NetworkModel) => m.powerCapacity)).toEqual([16, 8, 4]);
    expect(store.byKind('ceo')().map((m: NetworkModel) => m.trayCapacity)).toEqual([2, 4]);
    expect(
      store.byKind('cabo')().map((m: NetworkModel) => [m.role, m.fiberCapacity]),
    ).toEqual([
      ['BACKBONE', 24],
      ['FEEDER', 12],
      ['DISTRIBUTION', 12],
      ['DROP', 2],
    ]);
  });

  it('migrates legacy models found in storage', () => {
    localStorage.setItem(
      NETWORK_MODELS_STORAGE_KEY,
      JSON.stringify([{ id: 'old', kind: 'cto', name: 'Antiga', code: 'X', ports: '1x4', color: '#000', ...stamps }]),
    );
    const store = TestBed.inject(NetworkModelStoreService);
    expect(store.byKind('cto')()).toEqual([
      expect.objectContaining({ id: 'old', name: 'Antiga', powerCapacity: 4 }),
    ]);
  });
});
