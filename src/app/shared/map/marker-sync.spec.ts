import * as L from 'leaflet';
import { MapElement } from '../../core/network/map-element';
import { bindElementMarker, canDragMarker, elementChanged, pathClickIntent } from './marker-sync';

const box: MapElement = {
  key: 'box:b1',
  kind: 'box',
  id: 'b1',
  group: 'CTO',
  name: 'CTO-01',
  status: 'ACTIVE',
  position: { lat: 1, lng: 2 },
  details: [],
};

describe('canDragMarker', () => {
  it('allows dragging only with the move tool, edit permission and never customers', () => {
    expect(canDragMarker('move', true, 'box:b1')).toBe(true);
    expect(canDragMarker('select', true, 'box:b1')).toBe(false);
    expect(canDragMarker('move', false, 'box:b1')).toBe(false);
    expect(canDragMarker('move', true, 'customer:c1')).toBe(false);
  });
});

describe('elementChanged', () => {
  it('ignores identical data and spots position, name, status or group changes', () => {
    expect(elementChanged(box, { ...box, details: [] })).toBe(false);
    expect(elementChanged(undefined, box)).toBe(true);
    expect(elementChanged(box, { ...box, position: { lat: 1, lng: 3 } })).toBe(true);
    expect(elementChanged(box, { ...box, name: 'CTO-02' })).toBe(true);
    expect(elementChanged(box, { ...box, status: 'DAMAGED' })).toBe(true);
  });
});

describe('pathClickIntent', () => {
  it('turns a cable click into a map click while creating', () => {
    expect(pathClickIntent('addElement')).toBe('map');
    expect(pathClickIntent('addCable')).toBe('map');
    expect(pathClickIntent('select')).toBe('cable');
    expect(pathClickIntent('editCable')).toBe('cable');
    expect(pathClickIntent('move')).toBe('ignore');
  });
});

describe('bindElementMarker', () => {
  it('keeps listeners added by others and emits the latest element', () => {
    const marker = L.marker([1, 2]);
    const foreign = vi.fn();
    marker.on('dragend', foreign);
    let current = box;
    const moved = vi.fn();
    bindElementMarker(marker, () => current, { click: vi.fn(), dblclick: vi.fn(), dragend: moved });

    current = { ...box, name: 'CTO-renomeada' };
    marker.fire('dragend');

    expect(foreign).toHaveBeenCalled();
    expect(moved).toHaveBeenCalledWith(current, marker);
  });
});
