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
});
