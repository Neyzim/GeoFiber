import { describeCableEnds } from './cable-ends';

describe('describeCableEnds', () => {
  it('says when the ends are not defined yet', () => {
    expect(describeCableEnds([])).toBe('Início e fim ainda não definidos');
  });

  it('names the start and the end', () => {
    expect(
      describeCableEnds([
        { sequenceNumber: 1, role: 'START', oltId: 'o1', elementName: 'OLT-CENTRO' },
        { sequenceNumber: 2, role: 'END', boxId: 'b1', elementName: 'CEO-01' },
      ]),
    ).toBe('De OLT-CENTRO para CEO-01');
  });

  it('counts the boxes the cable passes through', () => {
    expect(
      describeCableEnds([
        { sequenceNumber: 1, role: 'START', oltId: 'o1', elementName: 'OLT-CENTRO' },
        { sequenceNumber: 2, role: 'PASS_THROUGH', boxId: 'b2', elementName: 'CTO-01' },
        { sequenceNumber: 3, role: 'PASS_THROUGH', boxId: 'b3', elementName: 'CTO-02' },
        { sequenceNumber: 4, role: 'END', boxId: 'b1', elementName: 'CEO-01' },
      ]),
    ).toBe('De OLT-CENTRO para CEO-01 (passa por 2)');
  });
});
