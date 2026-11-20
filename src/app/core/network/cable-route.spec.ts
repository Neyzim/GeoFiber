import { describeCableRoute, toAttachmentRequests, validateRoute } from './cable-route';

const olt = { ref: { kind: 'olt' as const, id: 'o1' }, name: 'OLT-CENTRO' };
const ceo = { ref: { kind: 'box' as const, id: 'b1' }, name: 'CEO-01' };
const cto = { ref: { kind: 'box' as const, id: 'b2' }, name: 'CTO-01' };

describe('toAttachmentRequests', () => {
  it('derives the roles from the position', () => {
    expect(toAttachmentRequests([olt, ceo, cto])).toEqual([
      { role: 'START', oltId: 'o1' },
      { role: 'PASS_THROUGH', boxId: 'b1' },
      { role: 'END', boxId: 'b2' },
    ]);
  });
});

describe('validateRoute', () => {
  it('accepts an empty list (clears it) and a list with start and end', () => {
    expect(validateRoute([])).toBeNull();
    expect(validateRoute([olt, ceo])).toBeNull();
  });

  it('asks for both ends', () => {
    expect(validateRoute([olt])).toBe('Escolha pelo menos o início e o fim.');
  });

  it('rejects repeated elements', () => {
    expect(validateRoute([olt, ceo, olt])).toBe('OLT-CENTRO aparece mais de uma vez.');
  });
});

describe('describeCableRoute', () => {
  it('explains an empty list', () => {
    expect(describeCableRoute([])).toBe(
      'Ainda não sabemos de onde este cabo sai nem aonde chega.',
    );
  });

  it('names start and end', () => {
    expect(
      describeCableRoute([
        { role: 'START', elementName: 'OLT-CENTRO' },
        { role: 'END', elementName: 'CEO-01' },
      ]),
    ).toBe('Este cabo sai de OLT-CENTRO e termina em CEO-01.');
  });

  it('lists the boxes it passes through', () => {
    expect(
      describeCableRoute([
        { role: 'START', elementName: 'OLT-CENTRO' },
        { role: 'PASS_THROUGH', elementName: 'CTO-01' },
        { role: 'PASS_THROUGH', elementName: 'CTO-02' },
        { role: 'END', elementName: 'CEO-01' },
      ]),
    ).toBe('Este cabo sai de OLT-CENTRO, passa por CTO-01 e CTO-02 e termina em CEO-01.');
  });

  it('says what is known when only one end exists', () => {
    expect(describeCableRoute([{ role: 'START', elementName: 'OLT-CENTRO' }])).toBe(
      'Este cabo sai de OLT-CENTRO; o fim ainda não foi definido.',
    );
  });
});
