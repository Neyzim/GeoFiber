import * as L from 'leaflet';
import { MapTool } from '../../core/models/geo.model';
import { MapElement } from '../../core/network/map-element';

/** Arrasto só na ferramenta "Mover", com permissão de edição e nunca em clientes. */
export function canDragMarker(tool: MapTool, editable: boolean, key: string): boolean {
  return tool === 'move' && editable && !key.startsWith('customer:');
}

/** O marcador precisa ser redesenhado? (posição, nome, situação ou tipo mudaram). */
export function elementChanged(previous: MapElement | undefined, next: MapElement): boolean {
  return (
    previous === undefined ||
    previous.position.lat !== next.position.lat ||
    previous.position.lng !== next.position.lng ||
    previous.name !== next.name ||
    previous.status !== next.status ||
    previous.group !== next.group
  );
}

/**
 * O que fazer com o clique numa linha de cabo: nas ferramentas de criação ele vale como
 * clique no mapa (criar elemento sobre o cabo, marcar vértice); senão seleciona o cabo.
 */
export function pathClickIntent(tool: MapTool): 'cable' | 'map' | 'ignore' {
  if (tool === 'addElement' || tool === 'addCable') {
    return 'map';
  }
  return tool === 'move' ? 'ignore' : 'cable';
}

export interface ElementMarkerHandlers {
  click(element: MapElement): void;
  dblclick(element: MapElement): void;
  dragend(element: MapElement, marker: L.Marker): void;
}

/**
 * Liga os eventos do marcador uma única vez. Os handlers leem o elemento atual por
 * `current()`, então não é preciso religar (o que removeria ouvintes de terceiros,
 * como os do agrupador de marcadores e do tooltip).
 */
export function bindElementMarker(
  marker: L.Marker,
  current: () => MapElement,
  handlers: ElementMarkerHandlers,
): void {
  marker.on('click', () => handlers.click(current()));
  marker.on('dblclick', () => handlers.dblclick(current()));
  marker.on('dragend', () => handlers.dragend(current(), marker));
}
