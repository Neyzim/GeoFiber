import { TestBed } from '@angular/core/testing';
import * as L from 'leaflet';
import { MapViewportService } from './map-viewport';

function fakeMap() {
  const crs = L.CRS.EPSG3857;
  return {
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    project: (latlng: L.LatLngExpression, zoom: number) => crs.latLngToPoint(L.latLng(latlng), zoom),
    unproject: (point: L.Point, zoom: number) => crs.pointToLatLng(point, zoom),
  };
}

describe('MapViewportService', () => {
  function setup() {
    const map = fakeMap();
    const service = TestBed.inject(MapViewportService);
    service.register(map as unknown as L.Map);
    return { map, service };
  }

  it('sem gaveta, centraliza no próprio ponto', () => {
    const { map, service } = setup();
    service.focus({ lat: -5.8, lng: -35.2 });
    const [target, zoom] = map.flyTo.mock.calls[0];
    expect(zoom).toBe(17);
    expect(L.latLng(target).lat).toBeCloseTo(-5.8, 6);
  });

  it('com gaveta embaixo, desloca o centro para o ponto ficar no meio da parte visível', () => {
    const { map, service } = setup();
    service.focus({ lat: -5.8, lng: -35.2 }, 17, 400);
    const [target] = map.flyTo.mock.calls[0];
    const point = map.project({ lat: -5.8, lng: -35.2 }, 17);
    const center = map.project(target, 17);
    expect(center.y - point.y).toBeCloseTo(200, 3);
    expect(center.x).toBeCloseTo(point.x, 3);
  });

  it('ao enquadrar vários pontos, reserva a altura da gaveta embaixo', () => {
    const { map, service } = setup();
    service.focusAll(
      [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ],
      17,
      300,
    );
    const options = map.fitBounds.mock.calls[0][1];
    expect(options.paddingTopLeft).toEqual([56, 56]);
    expect(options.paddingBottomRight).toEqual([56, 356]);
  });
});
