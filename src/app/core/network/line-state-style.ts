export type LineState = 'active' | 'planned' | 'disabled' | 'broken' | 'reserved';

export interface LineStyle {
  dasharray: string;
  linecap: 'round' | 'butt';
}

export function lineStyleByState(state: LineState): LineStyle {
  const patterns: Record<LineState, LineStyle> = {
    'active': { dasharray: '', linecap: 'round' },
    'planned': { dasharray: '4 4', linecap: 'round' },
    'disabled': { dasharray: '1 2', linecap: 'butt' },
    'broken': { dasharray: '1 2', linecap: 'butt' },
    'reserved': { dasharray: '4 4', linecap: 'round' }
  };
  return patterns[state];
}
