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
    expect(style.color).toBe('#d23c3c');
    expect(style.dashArray).toBe('4 6');
  });

  it('greys out a deactivated cable', () => {
    const style = cableLineStyle('BACKBONE', 'DEACTIVATED');
    expect(style.color).toBe('#8a96a3');
    expect(style.opacity).toBe(0.5);
  });

  it('finds customer statuses', () => {
    expect(statusDefinition('BLOCKED').label).toBe('Bloqueado');
  });

  it('colors infrastructure and customer statuses with theme tokens', () => {
    expect(statusDefinition('ACTIVE').color).toBe('var(--gf-status-normal)');
    expect(statusDefinition('INSTALLED').color).toBe('var(--gf-status-info)');
    expect(statusDefinition('PLANNED').color).toBe('var(--gf-status-alert)');
    expect(statusDefinition('DAMAGED').color).toBe('var(--gf-status-critical)');
    expect(statusDefinition('DEACTIVATED').color).toBe('var(--gf-status-inactive)');
    expect(statusDefinition('BLOCKED').color).toBe('var(--gf-status-alert)');
    expect(statusDefinition('CANCELLED').color).toBe('var(--gf-status-inactive)');
  });
});
