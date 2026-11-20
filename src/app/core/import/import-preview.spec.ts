import type { MapCable, MapElement } from '../network/map-element';
import { roleDefinition } from '../network/network-catalog';
import { groupPlacemarks, type ImportTarget } from './import-groups';
import type { KmlPlacemark } from './kml-reader';
import type { ImportMatch } from './import-match';
import { importPreview } from './import-preview';
import type { ImportChoices } from './import-request';

const at = (lat: number, lng: number) => ({ lat, lng });

const point = (ref: string, name: string, p: { lat: number; lng: number }): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'point', point: p },
  style: { iconHref: 'files/cto.png' },
});

const line = (ref: string, name: string): KmlPlacemark => ({
  ref,
  name,
  description: '',
  folderPath: [],
  geometry: { kind: 'line', points: [at(-10.6, -51.5), at(-10.61, -51.51)] },
  style: { lineColor: '#00ff00', lineWidth: 2 },
});

describe('importPreview', () => {
  it('shows new items with their type, moved items as a dashed path, and leaves out what already exists or is ignored', () => {
    const placemarks = [
      point('p-1', 'CTO-1', at(-10.65, -51.57)),
      point('p-2', 'Central', at(-10.7, -51.6)),
      point('p-3', 'CTO-3', at(-10.8, -51.7)),
      point('p-4', 'CTO-4', at(-10.9, -51.8)),
      point('p-5', 'CTO-5', at(-11, -51.9)),
      point('p-6', 'CTO-6', at(-11.1, -52)),
      line('l-7', 'Dist'),
    ];
    const groups = groupPlacemarks(placemarks);
    const pointGroup = groups.find((g) => g.geometry === 'point')!;
    const lineGroup = groups.find((g) => g.geometry === 'line')!;
    const c: ImportChoices = {
      groups: new Map([
        [pointGroup.key, { target: 'CTO' as ImportTarget, fiberCapacity: 12 }],
        [lineGroup.key, { target: 'DISTRIBUTION' as ImportTarget, fiberCapacity: 12 }],
      ]),
      items: new Map<string, ImportTarget>([
        ['p-2', 'OLT'],
        ['p-3', 'CTO'],
        ['p-4', 'CTO'],
        ['p-5', 'CTO'],
        ['p-6', 'IGNORE'],
      ]),
      moves: new Set(['p-4']),
      usageStatus: 'INSTALLED',
      linkCableEnds: true,
    };

    const matches = new Map<string, ImportMatch>([
      ['p-1', { status: 'new' }],
      ['p-2', { status: 'new' }],
      ['p-3', { status: 'new' }],
      ['p-4', { status: 'moved', id: 'b4', kind: 'box' }],
      ['p-5', { status: 'same', id: 'b5' }],
      ['l-7', { status: 'new' }],
    ]);
    const existing: MapElement = {
      key: 'box:b4',
      kind: 'box',
      id: 'b4',
      group: 'CTO',
      name: 'CTO-4',
      status: 'INSTALLED',
      position: at(-10.95, -51.85),
      details: [],
    };
    const network = { elements: [existing], cables: [] as MapCable[] };

    const preview = importPreview(groups, c, matches, network);

    const keys = preview.elements.map((e) => e.key);
    expect(keys).toEqual(['import:p-1', 'import:p-2', 'import:p-3', 'import:p-4']);
    expect(preview.elements.find((e) => e.key === 'import:p-2')).toMatchObject({ kind: 'olt', group: 'olt' });
    expect(preview.elements.find((e) => e.key === 'import:p-1')).toMatchObject({ kind: 'box', group: 'CTO', name: 'CTO-1' });
    expect(preview.elements.find((e) => e.key === 'import:p-4')!.position).toEqual(at(-10.9, -51.8));

    const cable = preview.paths.find((p) => p.id === 'import:l-7')!;
    expect(cable.color).toBe(roleDefinition('DISTRIBUTION').color);
    expect(cable.dashArray).toBeUndefined();

    const move = preview.paths.find((p) => p.id === 'move:p-4')!;
    expect(move.dashArray).toBe('4 6');
    expect(move.points).toEqual([at(-10.95, -51.85), at(-10.9, -51.8)]);

    expect(preview.points).toContainEqual(at(-10.9, -51.8));
    expect(preview.points).toContainEqual(at(-10.61, -51.51));
  });
});
