import { describeOltSummary, groupPortsBySlot, planPorts } from './olt-ports';

const ports = [
  { id: 'b', slotNumber: 2, portNumber: 1, status: 'FREE' as const },
  { id: 'a2', slotNumber: 1, portNumber: 2, status: 'OCCUPIED' as const, fiberId: 'f1' },
  { id: 'a1', slotNumber: 1, portNumber: 1, status: 'FREE' as const },
];

describe('groupPortsBySlot', () => {
  it('groups by slot and sorts slots and ports', () => {
    expect(
      groupPortsBySlot(ports).map((group) => [group.slot, group.ports.map((port) => port.id)]),
    ).toEqual([
      [1, ['a1', 'a2']],
      [2, ['b']],
    ]);
  });
});

describe('planPorts', () => {
  it('continues the numbering inside the chosen slot', () => {
    expect(planPorts(ports, 1, 2)).toEqual([
      { slotNumber: 1, portNumber: 3 },
      { slotNumber: 1, portNumber: 4 },
    ]);
    expect(planPorts(ports, 3, 1)).toEqual([{ slotNumber: 3, portNumber: 1 }]);
  });

  it('returns nothing for invalid input', () => {
    expect(planPorts(ports, 0, 4)).toEqual([]);
    expect(planPorts(ports, 1, 0)).toEqual([]);
  });
});

describe('describeOltSummary', () => {
  it('explains an OLT without ports', () => {
    expect(describeOltSummary([], 0)).toBe('Nenhuma porta PON cadastrada ainda.');
  });

  it('counts ports in use and cables', () => {
    expect(describeOltSummary(ports, 2)).toBe(
      'Esta OLT tem 3 portas PON (1 em uso). 2 cabos saem dela.',
    );
    expect(describeOltSummary(ports.slice(0, 1), 1)).toBe(
      'Esta OLT tem 1 porta PON (0 em uso). 1 cabo sai dela.',
    );
    expect(describeOltSummary(ports.slice(0, 1), 0)).toBe(
      'Esta OLT tem 1 porta PON (0 em uso). Nenhum cabo sai dela ainda.',
    );
  });
});
