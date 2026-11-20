import { MAP_FOCUS_CLASS, pathOpacity } from './map-focus';

describe('map-focus', () => {
  it('expõe a classe de foco do mapa', () => expect(MAP_FOCUS_CLASS).toBe('gf-map--focus'));

  it('pathOpacity returns 1 for selected', () => expect(pathOpacity(true, true)).toBe(1));

  it('pathOpacity returns 0.35 for unselected with focus', () =>
    expect(pathOpacity(false, true)).toBe(0.35));

  it('pathOpacity returns 0.9 for unselected without focus', () =>
    expect(pathOpacity(false, false)).toBe(0.9));

  it('pathOpacity uses custom base opacity', () => expect(pathOpacity(false, false, 0.5)).toBe(0.5));
});
