import { describe, it, expect } from 'vitest';
import { boxSides, cableSides, customerSides, oltSides, splitVisible } from './unifilar';

describe('unifilar', () => {
  it('splits cables by attachment role for a box', () => {
    const cables = [
      { name: 'A', attachmentRole: 'END', fiberCapacity: 12 },
      { name: 'B', attachmentRole: 'START', fiberCapacity: undefined },
      { name: 'C', attachmentRole: 'PASS_THROUGH', fiberCapacity: 6 },
    ] as any[];

    const sides = boxSides(cables);
    expect(sides.incoming).toEqual([
      { label: 'A', detail: '12 fibras' },
      { label: 'C', detail: '6 fibras' },
    ]);
    expect(sides.outgoing).toEqual([
      { label: 'B', detail: undefined },
      { label: 'C', detail: '6 fibras' },
    ]);
  });

  it('shows the first 3 items and counts the rest', () => {
    const items = [
      { label: 'C1' },
      { label: 'C2' },
      { label: 'C3' },
      { label: 'C4' },
      { label: 'C5' },
    ] as any[];

    const result = splitVisible(items);
    expect(result.shown).toEqual([{ label: 'C1' }, { label: 'C2' }, { label: 'C3' }]);
    expect(result.hidden).toBe(2);
  });

  it('returns all items if 2 or fewer', () => {
    const items = [{ label: 'C1' }, { label: 'C2' }] as any[];
    expect(splitVisible(items)).toEqual({ shown: items, hidden: 0 });
  });

  it('cable: first item arrives, last item leaves', () => {
    const sides = cableSides([{ name: 'OLT-1' }, { name: 'CEO-1' }, { name: 'CTO-2' }]);
    expect(sides).toEqual({ incoming: [{ label: 'OLT-1' }], outgoing: [{ label: 'CTO-2' }] });
  });

  it('cable: a single item only arrives; empty list has both sides empty', () => {
    expect(cableSides([{ name: 'OLT-1' }])).toEqual({ incoming: [{ label: 'OLT-1' }], outgoing: [] });
    expect(cableSides([])).toEqual({ incoming: [], outgoing: [] });
  });
  it('puts every cable on the outgoing side of an OLT', () => {
    const cables = [
      { name: 'A', attachmentRole: 'START', fiberCapacity: 12 },
      { name: 'B', attachmentRole: 'START' },
    ] as any[];

    expect(oltSides(cables)).toEqual({
      incoming: [],
      outgoing: [
        { label: 'A', detail: '12 fibras' },
        { label: 'B', detail: undefined },
      ],
    });
  });

  it('customer: the CTO and port arrive, nothing leaves', () => {
    expect(customerSides('CTO-01', 3, false)).toEqual({
      incoming: [{ label: 'CTO-01', detail: 'porta 3' }],
      outgoing: [],
    });
    expect(customerSides('CTO-01', undefined, false)).toEqual({
      incoming: [{ label: 'CTO-01' }],
      outgoing: [],
    });
  });

  it('customer: cancelled or without a CTO has both sides empty', () => {
    expect(customerSides('CTO-01', 3, true)).toEqual({ incoming: [], outgoing: [] });
    expect(customerSides(undefined, 3, false)).toEqual({ incoming: [], outgoing: [] });
  });
});
