import { discardLegacyStorage } from './legacy-storage';

describe('discardLegacyStorage', () => {
  it('removes the legacy pin and cable keys', () => {
    const removed: string[] = [];
    discardLegacyStorage({ removeItem: (key: string) => removed.push(key) });
    expect(removed).toEqual(['geofiber.pins.v1', 'geofiber.cables.v1']);
  });

  it('survives a throwing storage', () => {
    const throwing = {
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(() => discardLegacyStorage(throwing)).not.toThrow();
  });

  it('accepts a null storage', () => {
    expect(() => discardLegacyStorage(null)).not.toThrow();
  });
});
