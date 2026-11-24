import { MapTool } from '../../core/models/geo.model';

/** O que fazer com um clique num cabo do mapa. */
export type PathClickAction = 'ignore' | 'warnPicking' | 'edit' | 'select' | 'focus';

/**
 * Durante "Escolher no mapa" o clique num cabo não troca a ficha (perderia a lista).
 * Em "Selecionar", o segundo clique abre a edição; em "Mover cabo", reclicar o cabo
 * selecionado não faz nada.
 */
export function pathClickAction(
  tool: MapTool,
  picking: boolean,
  selectedCableId: string | null,
  cableId: string,
): PathClickAction {
  if (tool !== 'select' && tool !== 'editCable') {
    return 'ignore';
  }
  if (picking) {
    return 'warnPicking';
  }
  const same = selectedCableId === cableId;
  if (tool === 'editCable') {
    return same ? 'ignore' : 'select';
  }
  return same ? 'edit' : 'focus';
}
