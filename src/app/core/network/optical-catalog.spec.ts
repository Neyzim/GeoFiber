import {
  OPTICAL_COLORS,
  fiberLinkText,
  fiberStatusDefinition,
  opticalColor,
  planStructure,
  portStatusDefinition,
  structurePreview,
} from './optical-catalog';

describe('optical catalog', () => {
  it('lists the 12 ABNT colors in order, in Portuguese', () => {
    expect(OPTICAL_COLORS.map((color) => color.label)).toEqual([
      'Verde',
      'Amarelo',
      'Branco',
      'Azul',
      'Vermelho',
      'Violeta',
      'Marrom',
      'Rosa',
      'Preto',
      'Cinza',
      'Laranja',
      'Turquesa',
    ]);
    expect(opticalColor('WHITE').label).toBe('Branco');
  });

  it('colors fiber and port statuses with theme tokens', () => {
    expect(fiberStatusDefinition('AVAILABLE').color).toBe('var(--gf-status-normal)');
    expect(fiberStatusDefinition('OCCUPIED').color).toBe('var(--gf-status-info)');
    expect(fiberStatusDefinition('BROKEN').color).toBe('var(--gf-status-critical)');
    expect(fiberStatusDefinition('RESERVED').color).toBe('var(--gf-status-alert)');
    expect(portStatusDefinition('FREE').color).toBe('var(--gf-status-normal)');
    expect(portStatusDefinition('FAULTY').color).toBe('var(--gf-status-critical)');
  });

  it('gives each ABNT color a readable ink for the number on top', () => {
    const ink = Object.fromEntries(OPTICAL_COLORS.map((item) => [item.color, item.ink]));
    expect(ink).toEqual({
      GREEN: 'dark', YELLOW: 'dark', WHITE: 'dark', BLUE: 'dark', RED: 'light', VIOLET: 'light',
      BROWN: 'light', PINK: 'dark', BLACK: 'light', GRAY: 'dark', ORANGE: 'dark', TURQUOISE: 'dark',
    });
  });
});

describe('planStructure', () => {
  it('fills tubes up to the cable capacity, in ABNT color order', () => {
    expect(planStructure(24, 12)).toEqual([
      { tubeNumber: 1, capacity: 12, color: 'GREEN' },
      { tubeNumber: 2, capacity: 12, color: 'YELLOW' },
    ]);
  });

  it('puts the remainder in the last tube', () => {
    expect(planStructure(30, 12).map((tube) => tube.capacity)).toEqual([12, 12, 6]);
  });

  it('repeats the colors after the twelfth tube', () => {
    const tubes = planStructure(13, 1);
    expect(tubes).toHaveLength(13);
    expect(tubes[12].color).toBe('GREEN');
  });

  it('returns nothing for an invalid capacity', () => {
    expect(planStructure(0, 12)).toEqual([]);
    expect(planStructure(12, 0)).toEqual([]);
  });
});

describe('fiberLinkText', () => {
  it('describes what each fiber end is connected to', () => {
    const names = (id: string) => (id === 'b1' ? 'CEO-01' : undefined);
    expect(fiberLinkText({ end: 'A', status: 'AVAILABLE' }, names)).toBe('Ponta A: livre');
    expect(
      fiberLinkText(
        { end: 'B', status: 'CONNECTED', link: { type: 'FUSION', id: 's1', elementId: 'b1' } },
        names,
      ),
    ).toBe('Ponta B: fusão em CEO-01');
    expect(
      fiberLinkText(
        { end: 'A', status: 'CONNECTED', link: { type: 'OLT_PORT', id: 'p1', elementId: 'x' } },
        names,
      ),
    ).toBe('Ponta A: porta PON');
  });
});

describe('structurePreview', () => {
  it('summarises the planned tubes', () => {
    expect(structurePreview(24, 12)).toBe('2 tubos de 12 fibras = 24 fibras');
    expect(structurePreview(30, 12)).toBe('3 tubos (12, 12 e 6 fibras) = 30 fibras');
    expect(structurePreview(1, 12)).toBe('1 tubo de 1 fibra = 1 fibra');
  });
});
