import { buildLegendSections } from './legend-sections';
import { MapCable, MapElement } from './map-element';

const el = (id: string, group: MapElement['group']): MapElement => ({
  key: `${group === 'olt' ? 'olt' : group === 'customer' ? 'customer' : 'box'}:${id}`,
  kind: group === 'olt' ? 'olt' : group === 'customer' ? 'customer' : 'box',
  id,
  group,
  name: id,
  status: 'ACTIVE',
  position: { lat: 0, lng: 0 },
  details: [],
});

const feeder: MapCable = {
  id: 'k1',
  name: 'FEEDER-01',
  role: 'FEEDER',
  status: 'ACTIVE',
  points: [],
  fiberCapacity: 12,
  lengthMeters: null,
  details: [],
};

describe('buildLegendSections', () => {
  it('groups elements and cables in catalog order', () => {
    const [elements, cables] = buildLegendSections(
      [el('b1', 'CTO'), el('o1', 'olt'), el('b2', 'CTO')],
      [feeder],
      new Set(['CTO']),
    );
    expect(elements.groups.map((g) => g.key)).toEqual(['olt', 'CTO']);
    expect(elements.groups.map((g) => g.count)).toEqual([1, 2]);
    expect(elements.groups[1].hidden).toBe(true);
    expect(elements.groups[1].items[0].id).toBe('box:b1');
    expect(cables.groups[0].key).toBe('FEEDER');
    expect(cables.groups[0].label).toBe('Alimentação');
  });

  it('marks customers as not editable', () => {
    const [elements] = buildLegendSections([el('c1', 'customer'), el('b1', 'CTO')], [], new Set());
    const editable = elements.groups.flatMap((g) => g.items).map((leaf) => leaf.editable);
    expect(editable).toEqual([true, false]);
  });
});
