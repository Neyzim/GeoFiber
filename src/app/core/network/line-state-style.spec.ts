import { describe, it, expect } from 'vitest';
import { lineStyleByState, lineStateOf, fiberLineState } from './line-state-style';

describe('lineStyleByState', () => {
  it('returns dasharray and linecap for each state', () => {
    const styles = {
      active: lineStyleByState('active'),
      planned: lineStyleByState('planned'),
      reserved: lineStyleByState('reserved'),
      disabled: lineStyleByState('disabled'),
      broken: lineStyleByState('broken'),
    };

    expect(styles.active).toEqual({ dasharray: '', linecap: 'round' });
    expect(styles.planned).toEqual({ dasharray: '4 4', linecap: 'round' });
    expect(styles.reserved).toEqual({ dasharray: '8 3', linecap: 'round' });
    expect(styles.disabled).toEqual({ dasharray: '1 3', linecap: 'butt' });
    expect(styles.broken).toEqual({ dasharray: '6 2 1 2', linecap: 'butt' });

    // All patterns must be different
    const patterns = [
      styles.active.dasharray,
      styles.planned.dasharray,
      styles.reserved.dasharray,
      styles.disabled.dasharray,
      styles.broken.dasharray,
    ];
    expect(new Set(patterns).size).toBe(5);
  });
});

describe('lineStateOf', () => {
  it('maps infrastructure statuses to line states', () => {
    expect(lineStateOf('ACTIVE')).toBe('active');
    expect(lineStateOf('INSTALLED')).toBe('active');
    expect(lineStateOf('PLANNED')).toBe('planned');
    expect(lineStateOf('BLOCKED')).toBe('reserved');
    expect(lineStateOf('DEACTIVATED')).toBe('disabled');
    expect(lineStateOf('DAMAGED')).toBe('broken');
    expect(lineStateOf('CANCELLED')).toBe('disabled');
  });
});

describe('fiberLineState', () => {
  it('maps fiber statuses to line states', () => {
    expect(fiberLineState('AVAILABLE')).toBe('active');
    expect(fiberLineState('OCCUPIED')).toBe('active');
    expect(fiberLineState('BROKEN')).toBe('broken');
    expect(fiberLineState('RESERVED')).toBe('reserved');
    expect(fiberLineState(undefined)).toBe('active');
  });
});
