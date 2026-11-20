import type { MapCable, MapElement } from '../network/map-element';
import type { KmlPlacemark } from './kml-reader';
import type { ImportTarget } from './import-groups';
import { matchPlacemarks, type ExistingNetwork } from './import-match';

const at = (lat: number, lng: number) => ({ lat, lng });
// 0,0001° de latitude ≈ 11 m; 0,00003° ≈ 3 m; 0,0004° ≈ 44 m
const BASE = at(-10.65, -51.57);
const NEAR_3M = at(-10.65003, -51.57);
const FAR_40M = at(-10.6504, -51.57);

const box = (id: string, name: string, group: 'CTO' | 'CEO' | 'DIO', position = BASE): MapElement => ({
  key: `box:${id}`,
  kind: 'box',
  id,
  group,
  name,
  status: 'INSTALLED',
  position,
  details: [],
});

const olt = (id: string, name: string, position = BASE): MapElement => ({
  key: `olt:${id}`,
  kind: 'olt',
  id,
  group: 'olt',
  name,
  status: 'INSTALLED',
  position,
  details: [],
});

const cable = (id: string, name: string, a: typeof BASE, b: typeof BASE): MapCable => ({
  id,
  name,
  role: 'DISTRIBUTION',
  status: 'INSTALLED',
  points: [a, b],
  fiberCapacity: 12,
  lengthMeters: null,
  details: [],
});

const pointItem = (ref: string, name: string, position: typeof BASE): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'point', point: position },
  style: {},
});

const lineItem = (ref: string, name: string, a: typeof BASE, b: typeof BASE): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'line', points: [a, b] },
  style: {},
});

const run = (
  items: { placemark: KmlPlacemark; target: ImportTarget }[],
  network: ExistingNetwork,
) => matchPlacemarks(items, network);

describe('matchPlacemarks', () => {
  it('recognizes the same name and type in the same place', () => {
    const network = { elements: [box('b1', 'CTO-001', 'CTO')], cables: [] };
    const result = run([{ placemark: pointItem('p-1', 'cto 001', NEAR_3M), target: 'CTO' }], network);
    expect(result.get('p-1')).toEqual({ status: 'same', id: 'b1' });
  });

  it('marks a known name in another place as moved', () => {
    const network = { elements: [box('b1', 'CTO-001', 'CTO')], cables: [] };
    const result = run([{ placemark: pointItem('p-1', 'CTO-001', FAR_40M), target: 'CTO' }], network);
    expect(result.get('p-1')).toEqual({ status: 'moved', id: 'b1', kind: 'box' });
  });

  it('uses the position when the name is empty or repeated in the file', () => {
    const network = {
      elements: [box('b1', 'CEO-1', 'CEO'), box('b2', 'CTO-9', 'CTO', FAR_40M)],
      cables: [],
    };
    const result = run(
      [
        { placemark: pointItem('p-1', '', NEAR_3M), target: 'CEO' },
        { placemark: pointItem('p-2', 'CTO', NEAR_3M), target: 'CTO' },
        { placemark: pointItem('p-3', 'CTO', at(-10.7, -51.6)), target: 'CTO' },
      ],
      network,
    );
    expect(result.get('p-1')).toEqual({ status: 'same', id: 'b1' });
    expect(result.get('p-2')).toEqual({ status: 'new' });
    expect(result.get('p-3')).toEqual({ status: 'new' });
  });

  it('does not mix types, but warns about a name taken by another type', () => {
    const network = { elements: [box('b1', 'CTO-01', 'CTO')], cables: [] };
    const result = run([{ placemark: pointItem('p-1', 'CTO-01', BASE), target: 'CEO' }], network);
    expect(result.get('p-1')).toEqual({ status: 'new', nameTakenByOtherType: 'CTO' });
  });

  it('compares OLT targets with OLTs only', () => {
    const network = { elements: [box('b1', 'Central', 'CTO')], cables: [] };
    const result = run([{ placemark: pointItem('p-1', 'Central', BASE), target: 'OLT' }], network);
    expect(result.get('p-1')).toEqual({ status: 'new', nameTakenByOtherType: 'CTO' });

    const withOlt = { elements: [olt('o1', 'Central')], cables: [] };
    const same = run([{ placemark: pointItem('p-1', 'Central', BASE), target: 'OLT' }], withOlt);
    expect(same.get('p-1')).toEqual({ status: 'same', id: 'o1' });
  });

  it('recognizes cables by name, or by both ends in any order', () => {
    const network = {
      elements: [],
      cables: [cable('c1', 'CABO-01', BASE, FAR_40M)],
    };
    const inverted = run(
      [{ placemark: lineItem('l-1', 'cabo-01', FAR_40M, BASE), target: 'DISTRIBUTION' }],
      network,
    );
    expect(inverted.get('l-1')).toEqual({ status: 'same', id: 'c1' });

    const unnamed = run(
      [{ placemark: lineItem('l-2', '', BASE, FAR_40M), target: 'DISTRIBUTION' }],
      network,
    );
    expect(unnamed.get('l-2')).toEqual({ status: 'same', id: 'c1' });

    const far = run(
      [{ placemark: lineItem('l-3', 'CABO-01', at(-10.7, -51.6), at(-10.71, -51.61)), target: 'DISTRIBUTION' }],
      network,
    );
    expect(far.get('l-3')).toEqual({ status: 'moved', id: 'c1', kind: 'cable' });
  });

  it('leaves out items marked to be ignored', () => {
    const network = { elements: [], cables: [] };
    const result = run([{ placemark: pointItem('p-1', 'X', BASE), target: 'IGNORE' }], network);
    expect(result.has('p-1')).toBe(false);
  });
});
