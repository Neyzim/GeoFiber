import { SHEET_DISMISS, SHEET_MAX, SHEET_OPEN, dragEnd, dragHeight } from './sheet-drag';

describe('sheet-drag', () => {
  it('abre em 35%, vai até 90% e fecha abaixo de 20%', () => {
    expect(SHEET_OPEN).toBe(0.35);
    expect(SHEET_MAX).toBe(0.9);
    expect(SHEET_DISMISS).toBe(0.2);
  });

  it('puxar para cima aumenta livremente, até 90%', () => {
    expect(dragHeight(0.35, -100, 1000)).toBeCloseTo(0.45);
    expect(dragHeight(0.35, -500, 1000)).toBeCloseTo(0.85);
    expect(dragHeight(0.35, -1000, 1000)).toBe(0.9);
  });

  it('puxar para baixo diminui, até zero', () => {
    expect(dragHeight(0.35, 100, 1000)).toBeCloseTo(0.25);
    expect(dragHeight(0.35, 1000, 1000)).toBe(0);
  });

  it('tela sem altura não muda nada', () => {
    expect(dragHeight(0.35, 100, 0)).toBe(0.35);
  });

  it('ao soltar: abaixo de 20% fecha; senão fica onde parou', () => {
    expect(dragEnd(0.19)).toBe('dismiss');
    expect(dragEnd(0.2)).toBe(0.2);
    expect(dragEnd(0.42)).toBe(0.42);
  });
});
