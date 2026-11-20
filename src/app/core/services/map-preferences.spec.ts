import { TestBed } from '@angular/core/testing';
import { BASE_LAYERS, MAP_PREFERENCES_STORAGE_KEY } from '../constants/map.constants';
import { MapPreferencesService } from './map-preferences';

describe('MapPreferencesService', () => {
  beforeEach(() => localStorage.clear());

  it('offers only the street map and the satellite map', () => {
    expect(BASE_LAYERS.map((layer) => layer.key)).toEqual(['streets', 'satellite']);
  });

  it('falls back to the street map when a removed map was saved', () => {
    localStorage.setItem(
      MAP_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ baseLayerKey: 'dark', baseLayerOpacity: 0.8 }),
    );
    const service = TestBed.inject(MapPreferencesService);
    expect(service.baseLayerKey()).toBe('streets');
    expect(service.baseLayerOpacity()).toBe(0.8);
  });

  it('keeps the satellite map when it was saved', () => {
    localStorage.setItem(MAP_PREFERENCES_STORAGE_KEY, JSON.stringify({ baseLayerKey: 'satellite' }));
    expect(TestBed.inject(MapPreferencesService).baseLayerKey()).toBe('satellite');
  });
});
