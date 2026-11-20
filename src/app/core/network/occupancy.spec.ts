import { describe, it, expect } from 'vitest';
import { servicePortOccupancy, splitterOccupancy, oltPortOccupancy, tubeOccupancy } from './occupancy';

describe('occupancy', () => {
  it('counts service ports with customerId as occupied', () => {
    const ports = [{ customerId: 'c1' }, { customerId: undefined }, { customerId: 'c3' }] as any[];
    expect(servicePortOccupancy(ports)).toEqual({ occupied: 2, capacity: 3 });
  });

  it('counts splitter ports with servicePortId or fiberId, excluding INPUT', () => {
    const splitter = {
      ports: [
        { direction: 'INPUT', servicePortId: undefined, fiberId: undefined },
        { direction: 'OUTPUT', servicePortId: 'sp1', fiberId: undefined },
        { direction: 'OUTPUT', servicePortId: undefined, fiberId: undefined },
        { direction: 'OUTPUT', servicePortId: undefined, fiberId: 'f1' },
        { direction: 'OUTPUT', servicePortId: undefined, fiberId: undefined },
      ],
    } as any;
    expect(splitterOccupancy(splitter)).toEqual({ occupied: 2, capacity: 4 });
  });

  it('counts OLT ports with fiberId or status OCCUPIED as occupied', () => {
    const ports = [
      { status: 'FREE' as any, fiberId: undefined },
      { status: 'OCCUPIED' as any, fiberId: undefined },
      { status: 'FREE' as any, fiberId: 'f1' },
    ] as any[];
    expect(oltPortOccupancy(ports)).toEqual({ occupied: 2, capacity: 3 });
  });

  it('counts fibers with status OCCUPIED as occupied', () => {
    const fibers = [
      { status: 'OCCUPIED' as any },
      { status: 'AVAILABLE' as any },
      { status: 'BROKEN' as any },
      { status: undefined },
    ] as any[];
    expect(tubeOccupancy(fibers)).toEqual({ occupied: 1, capacity: 4 });
  });

  it('returns 0/0 for empty lists', () => {
    expect(servicePortOccupancy([])).toEqual({ occupied: 0, capacity: 0 });
    expect(oltPortOccupancy([])).toEqual({ occupied: 0, capacity: 0 });
    expect(tubeOccupancy([])).toEqual({ occupied: 0, capacity: 0 });
    expect(splitterOccupancy({ ports: [] })).toEqual({ occupied: 0, capacity: 0 });
  });
});
