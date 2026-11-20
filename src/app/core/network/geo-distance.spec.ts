import { distanceMeters } from './geo-distance';

describe('distanceMeters', () => {
  it('measures 0.001 degree of latitude as about 111 m', () => {
    const d = distanceMeters({ lat: -10.65, lng: -51.57 }, { lat: -10.651, lng: -51.57 });
    expect(Math.abs(d - 111)).toBeLessThan(1);
  });

  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: -10.65, lng: -51.57 }, { lat: -10.65, lng: -51.57 })).toBe(0);
  });
});
