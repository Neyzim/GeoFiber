import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MapCable, MapElement } from './map-element';
import { NetworkMapRepository } from './network-map-repository';
import { NetworkMapState } from './network-map-state';

function element(partial: Partial<MapElement> & Pick<MapElement, 'id' | 'group'>): MapElement {
  const kind = partial.group === 'olt' ? 'olt' : partial.group === 'customer' ? 'customer' : 'box';
  return {
    key: `${kind}:${partial.id}`,
    kind,
    name: partial.id,
    status: 'ACTIVE',
    position: { lat: 0, lng: 0 },
    details: [],
    ...partial,
  };
}

function cable(id: string, role: MapCable['role']): MapCable {
  return {
    id,
    name: id,
    role,
    status: 'ACTIVE',
    points: [],
    fiberCapacity: 12,
    lengthMeters: null,
    details: [],
  };
}

describe('NetworkMapState', () => {
  const elements = signal<readonly MapElement[]>([]);
  const mapCables = signal<readonly MapCable[]>([]);
  let state: NetworkMapState;

  beforeEach(() => {
    elements.set([]);
    mapCables.set([]);
    TestBed.configureTestingModule({
      providers: [{ provide: NetworkMapRepository, useValue: { elements, mapCables } }],
    });
    state = TestBed.inject(NetworkMapState);
  });

  it('filters by status but keeps customers', () => {
    elements.set([
      element({ id: 'b1', group: 'CTO', status: 'ACTIVE' }),
      element({ id: 'b2', group: 'CTO', status: 'PLANNED' }),
      element({ id: 'c1', group: 'customer', status: 'BLOCKED' }),
    ]);
    state.setStatusFilter(['ACTIVE']);
    expect(state.visibleElements().map((e) => e.id)).toEqual(['b1', 'c1']);
  });

  it('hides a group', () => {
    elements.set([element({ id: 'b1', group: 'CTO' }), element({ id: 'o1', group: 'olt' })]);
    mapCables.set([cable('k1', 'FEEDER'), cable('k2', 'DROP')]);
    state.toggleGroup('CTO');
    state.toggleGroup('FEEDER');
    expect(state.visibleElements().map((e) => e.id)).toEqual(['o1']);
    expect(state.visibleCables().map((c) => c.id)).toEqual(['k2']);
  });

  it('search ignores case and accents', () => {
    elements.set([
      element({ id: 'b1', group: 'CTO', name: 'CTO-Centro' }),
      element({ id: 'b2', group: 'CEO', name: 'São Jorge' }),
    ]);
    state.setSearch('cto centro');
    expect(state.visibleElements().map((e) => e.id)).toEqual(['b1']);
    state.setSearch('sao');
    expect(state.visibleElements().map((e) => e.id)).toEqual(['b2']);
  });

  it('clears selection when the item disappears', () => {
    elements.set([element({ id: 'b1', group: 'CTO' })]);
    state.select({ type: 'element', key: 'box:b1' });
    expect(state.selectedElement()?.id).toBe('b1');
    elements.set([]);
    TestBed.tick();
    expect(state.selectedElement()).toBeNull();
    expect(state.selection()).toBeNull();
  });
});
