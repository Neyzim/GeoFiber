import { cableLineStyle, statusDefinition } from './network-catalog';

describe('network catalog', () => {
  it('uses the role color for an active cable', () => {
    expect(cableLineStyle('FEEDER', 'ACTIVE')).toEqual({
      color: '#e53935',
      weight: 5,
      opacity: 0.9,
    });
  });

  it('dashes a planned cable', () => {
    expect(cableLineStyle('DROP', 'PLANNED').dashArray).toBe('10 8');
  });

  it('paints a damaged cable red and dashed', () => {
    const style = cableLineStyle('BACKBONE', 'DAMAGED');
    expect(style.color).toBe('#e53935');
    expect(style.dashArray).toBe('4 6');
  });

  it('greys out a deactivated cable', () => {
    const style = cableLineStyle('BACKBONE', 'DEACTIVATED');
    expect(style.color).toBe('#9e9e9e');
    expect(style.opacity).toBe(0.5);
  });

  it('finds customer statuses', () => {
    expect(statusDefinition('BLOCKED').label).toBe('Bloqueado');
  });
});
