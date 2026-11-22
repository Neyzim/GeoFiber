import { NEW_TRAY_CAPACITY, spliceSides, trayChoiceText, trayForNewSplice } from './splice-plan';

describe('splice-plan', () => {
  it('usa a bandeja de menor número com posição livre', () => {
    expect(
      trayForNewSplice(
        [
          { trayNumber: 2, capacity: 12, usedPositions: 0 },
          { trayNumber: 1, capacity: 2, usedPositions: 2 },
        ],
        [],
        null,
      ),
    ).toEqual({ kind: 'existing', trayNumber: 2 });
    expect(trayForNewSplice([{ trayNumber: 1, capacity: 12, usedPositions: 3 }], [], null)).toEqual({
      kind: 'existing',
      trayNumber: 1,
    });
  });

  it('conta as fusões quando a bandeja não traz usedPositions', () => {
    expect(trayForNewSplice([{ trayNumber: 1, capacity: 1 }], [{ trayNumber: 1 }], null)).toEqual({
      kind: 'create',
      trayNumber: 2,
      capacity: 12,
    });
  });

  it('sem bandeja cria a 1 com 12 posições', () => {
    expect(NEW_TRAY_CAPACITY).toBe(12);
    expect(trayForNewSplice([], [], null)).toEqual({ kind: 'create', trayNumber: 1, capacity: 12 });
    expect(trayForNewSplice([], [], 1)).toEqual({ kind: 'create', trayNumber: 1, capacity: 12 });
  });

  it('respeita o máximo de bandejas da caixa', () => {
    expect(trayForNewSplice([{ trayNumber: 1, capacity: 1, usedPositions: 1 }], [], 1)).toEqual({ kind: 'full' });
  });

  it('o cabo que chega é a entrada; o que sai, a saída, com as pontas usadas', () => {
    expect(spliceSides({ fiberId: 'x', role: 'START' }, { fiberId: 'y', role: 'END' })).toEqual({
      inputFiberId: 'y',
      inputFiberEnd: 'B',
      outputFiberId: 'x',
      outputFiberEnd: 'A',
    });
  });

  it('mesmo papel: a primeira tocada é a entrada (sangria no mesmo cabo que passa)', () => {
    expect(spliceSides({ fiberId: 'x', role: 'PASS_THROUGH' }, { fiberId: 'y', role: 'PASS_THROUGH' })).toEqual({
      inputFiberId: 'x',
      inputFiberEnd: 'B',
      outputFiberId: 'y',
      outputFiberEnd: 'A',
    });
  });

  it('frases da bandeja', () => {
    expect(trayChoiceText({ kind: 'existing', trayNumber: 1 })).toBe('Vai para a bandeja 1, na próxima posição livre.');
    expect(trayChoiceText({ kind: 'create', trayNumber: 2, capacity: 12 })).toBe('Vou criar a bandeja 2 (12 posições).');
    expect(trayChoiceText({ kind: 'full' })).toBe('Esta caixa não comporta mais bandejas.');
  });
});
