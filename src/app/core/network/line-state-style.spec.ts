import { lineStyleByState } from './line-state-style';

describe('lineStyleByState', () => {
  it('returns solid for active', () => {
    const result = lineStyleByState('active');
    expect(result).toEqual({ dasharray: '', linecap: 'round' });
  });

  it('returns dashed for planned', () => {
    const result = lineStyleByState('planned');
    expect(result.dasharray).toContain('4');
  });

  it('returns dotted for disabled', () => {
    const result = lineStyleByState('disabled');
    expect(result.dasharray).toContain('1');
  });

  it('returns dotted for broken', () => {
    const result = lineStyleByState('broken');
    expect(result.dasharray).toContain('1');
  });

  it('returns dashed for reserved', () => {
    const result = lineStyleByState('reserved');
    expect(result.dasharray).toContain('4');
  });
});
