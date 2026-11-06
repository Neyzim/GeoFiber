import * as L from 'leaflet';
import { Pin, pinColor, pinStatusDefinition, pinTypeDefinition } from '../../core/models/pin.model';

export const PIN_ICON_SIZE: readonly [number, number] = [34, 38];
export const PIN_ICON_ANCHOR: readonly [number, number] = [17, 37];

/** Escapa texto antes de injetá-lo no HTML do marcador (Leaflet usa `innerHTML`). */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
}

/**
 * Cria o ícone (HTML/CSS) de um PIN. O visual é desenhado por CSS puro para
 * não depender de fontes de ícones nem de imagens externas.
 */
export function createPinIcon(pin: Pin, selected = false): L.DivIcon {
  const type = pinTypeDefinition(pin.type);
  const status = pinStatusDefinition(pin.status);
  const classes = [
    'gf-pin',
    `gf-pin--${pin.type}`,
    `gf-pin--status-${pin.status}`,
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const html = `
    <span class="${classes}" style="--gf-pin-color:${escapeHtml(pinColor(pin))}">
      <span class="gf-pin__tip"></span>
      <span class="gf-pin__head"><span class="gf-pin__code">${escapeHtml(type.code)}</span></span>
      <span class="gf-pin__status" style="background:${escapeHtml(status.color)}"></span>
    </span>`;

  return L.divIcon({
    className: 'gf-pin-wrapper',
    html,
    iconSize: [PIN_ICON_SIZE[0], PIN_ICON_SIZE[1]],
    iconAnchor: [PIN_ICON_ANCHOR[0], PIN_ICON_ANCHOR[1]],
    tooltipAnchor: [0, -30],
  });
}

/** Pré-visualização que acompanha o cursor na ferramenta "Adicionar PIN". */
export function createGhostIcon(color = '#1e88e5'): L.DivIcon {
  const safe = escapeHtml(color);
  return L.divIcon({
    className: 'gf-pin-ghost',
    html: `<span class="gf-pin-ghost__dot" style="border-color:${safe};background:${safe}33"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Ícone do ponto de localização do usuário. */
export function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'gf-user-location',
    html: '<span class="gf-user-location__dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Conteúdo do tooltip de um PIN. */
export function pinTooltipHtml(pin: Pin): string {
  const type = pinTypeDefinition(pin.type);
  const status = pinStatusDefinition(pin.status);
  return `<strong>${escapeHtml(pin.name)}</strong><br>${escapeHtml(type.label)} · ${escapeHtml(status.label)}`;
}
