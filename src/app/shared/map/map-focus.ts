/**
 * Foco no elemento selecionado: com algo selecionado, o resto do mapa esmaece
 * (marcadores a 45% via CSS em `styles.scss`, cabos a 35% via `pathOpacity`).
 */

/** Classe posta no contêiner do Leaflet enquanto há elemento ou cabo selecionado. */
export const MAP_FOCUS_CLASS = 'gf-map--focus';

/** Opacidade dos cabos que não estão selecionados enquanto há foco. */
const DIMMED_PATH_OPACITY = 0.35;

/** Opacidade de um cabo: selecionado → 1; outro com foco → 0.35; sem foco → `base`. */
export function pathOpacity(selected: boolean, hasFocus: boolean, base = 0.9): number {
  if (selected) {
    return 1;
  }
  return hasFocus ? DIMMED_PATH_OPACITY : base;
}
