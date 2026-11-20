import type { KmlPlacemark, KmlStyle } from './kml-reader';
import { groupPlacemarks, LINE_TARGETS, POINT_TARGETS, suggestTarget } from './import-groups';

const point = (
  ref: string,
  name: string,
  folderPath: string[],
  style: KmlStyle = { iconHref: 'files/cto.png', iconColor: '#ff8800' },
): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath,
  geometry: { kind: 'point', point: { lat: -10.65, lng: -51.57 } },
  style,
});

const line = (
  ref: string,
  name: string,
  folderPath: string[],
  style: KmlStyle = { lineColor: '#00ff00', lineWidth: 3 },
): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath,
  geometry: {
    kind: 'line',
    points: [
      { lat: -10.65, lng: -51.57 },
      { lat: -10.66, lng: -51.58 },
    ],
  },
  style,
});

describe('groupPlacemarks', () => {
  it('groups points by folder and icon, and lines by folder, color and width', () => {
    const groups = groupPlacemarks([
      point('p-1', 'CTO-001', ['Rede', 'CTOs']),
      point('p-2', 'CTO-002', ['Rede', 'CTOs']),
      point('p-3', 'CEO-07', ['Rede', 'CTOs'], { iconHref: 'files/ceo.png', iconColor: '#8800ff' }),
      line('l-4', 'Tronco', ['Rede'], { lineColor: '#ff0000', lineWidth: 4 }),
      line('l-5', 'Ramal', ['Rede'], { lineColor: '#00ff00', lineWidth: 2 }),
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1, 1, 1]);
    expect(groups.map((g) => g.geometry)).toEqual(['point', 'point', 'line', 'line']);
  });

  it('names a group after its last folder, or "Sem pasta"', () => {
    const [a, b] = groupPlacemarks([
      point('p-1', 'X', ['Rede', 'CTOs']),
      point('p-2', 'Y', [], { iconHref: 'other.png' }),
    ]);
    expect(a.label).toBe('CTOs');
    expect(b.label).toBe('Sem pasta');
  });
});

describe('suggestTarget', () => {
  it('suggests the type from the folder or from most item names', () => {
    const [byFolder] = groupPlacemarks([point('p-1', 'Qualquer', ['CTOs Centro'])]);
    expect(suggestTarget(byFolder)).toBe('CTO');

    const [byNames] = groupPlacemarks([
      point('p-1', 'CEO-1', ['Caixas']),
      point('p-2', 'CEO-2', ['Caixas']),
      point('p-3', 'X', ['Caixas']),
    ]);
    expect(suggestTarget(byNames)).toBe('CEO');

    const [olt] = groupPlacemarks([point('p-1', 'Central', ['OLT Matriz'])]);
    expect(suggestTarget(olt)).toBe('OLT');
  });

  it('suggests nothing for other folders and for lines', () => {
    const [postes] = groupPlacemarks([point('p-1', 'P-1', ['Postes'])]);
    expect(suggestTarget(postes)).toBeNull();
    const [cabo] = groupPlacemarks([line('l-1', 'C-1', ['CTOs'])]);
    expect(suggestTarget(cabo)).toBeNull();
  });
});

describe('target lists', () => {
  it('offer the point and line types with the screen labels', () => {
    expect(POINT_TARGETS.map((t) => t.label)).toEqual(['CTO', 'CEO', 'DIO', 'OLT', 'Ignorar']);
    expect(LINE_TARGETS.map((t) => t.label)).toEqual([
      'Backbone',
      'Alimentação',
      'Distribuição',
      'Drop',
      'Interconexão',
      'Ignorar',
    ]);
  });
});
