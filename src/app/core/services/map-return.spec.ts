import { TestBed } from '@angular/core/testing';
import { MapReturnService } from './map-return';

describe('MapReturnService', () => {
  it('keeps one target until the map takes it', () => {
    const service = TestBed.inject(MapReturnService);
    expect(service.take()).toBeNull();

    service.request({ type: 'element', key: 'box:b1' }, true);
    service.request({ type: 'cable', id: 'c1' }, false);
    expect(service.take()).toEqual({ selection: { type: 'cable', id: 'c1' }, focus: false });
    expect(service.take()).toBeNull();
  });

  it('carries a request to frame points on the map', () => {
    const service = TestBed.inject(MapReturnService);
    const points = [{ lat: -10.65, lng: -51.57 }, { lat: -10.7, lng: -51.6 }];
    service.requestFit(points);
    expect(service.take()).toEqual({ fit: points });
    expect(service.take()).toBeNull();
  });
});
