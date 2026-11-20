import { toCoordinate, toCoordinates, toGeoPoint, toGeoPoints } from './coordinates';

describe('coordinates', () => {
  it('toCoordinate keeps longitude first', () => {
    expect(toCoordinate({ lat: -23.5505, lng: -46.6333 })).toEqual({
      longitude: -46.6333,
      latitude: -23.5505,
    });
  });

  it('toGeoPoint inverts toCoordinate', () => {
    expect(toGeoPoint({ longitude: -46.6333, latitude: -23.5505 })).toEqual({
      lat: -23.5505,
      lng: -46.6333,
    });
  });

  it('converts arrays preserving order', () => {
    const coordinates = [
      { longitude: -46.6333, latitude: -23.5505 },
      { longitude: -46.632, latitude: -23.551 },
    ];
    expect(toGeoPoints(coordinates)).toEqual([
      { lat: -23.5505, lng: -46.6333 },
      { lat: -23.551, lng: -46.632 },
    ]);
    expect(toCoordinates(toGeoPoints(coordinates))).toEqual(coordinates);
  });
});
