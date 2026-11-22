/**
 * Gaveta das fichas no celular (< 900px): altura em fração da tela.
 * Spec: docs/superpowers/specs/2026-11-22-ajustes-mapa-celular-design.md, item 6.
 */

/** Altura com que a ficha abre. */
export const SHEET_OPEN = 0.35;
/** Altura máxima ao puxar para cima: expande livremente, deixando só uma faixa do mapa à vista. */
export const SHEET_MAX = 0.9;
/** Soltar abaixo disso fecha a ficha (tira a seleção). */
export const SHEET_DISMISS = 0.2;

/** Altura nova depois de arrastar `deltaY` pixels (negativo = para cima), limitada a [0, SHEET_MAX]. */
export function dragHeight(startFraction: number, deltaY: number, viewport: number): number {
  if (viewport <= 0) return startFraction;
  return Math.min(SHEET_MAX, Math.max(0, startFraction - deltaY / viewport));
}

/** O que fazer ao soltar a alça: fechar ou ficar na altura em que parou. */
export function dragEnd(fraction: number): 'dismiss' | number {
  return fraction < SHEET_DISMISS ? 'dismiss' : fraction;
}
