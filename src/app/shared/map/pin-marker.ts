import * as L from 'leaflet';
import { ElementDetail, MapElement } from '../../core/network/map-element';
import { groupDefinition, statusDefinition } from '../../core/network/network-catalog';

/**
 * Balão de texto simples (marcadores de impacto e de quebra do rastreio). Nomes vêm de quem
 * cadastra ou de um KMZ importado, e o Leaflet usa `innerHTML`: sempre escapar.
 */
export function plainPopup(text: string): string {
  return escapeHtml(text);
}

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
 * Cria o ícone (HTML/CSS) de um elemento: código e cor do tipo, ponto com a cor da
 * situação. Desenhado em CSS puro, sem fontes de ícones nem imagens externas.
 */
/** `highlighted`: o elemento faz parte do cabo aberto na ficha (anel em volta). */
export function createElementIcon(
  element: MapElement,
  selected = false,
  highlighted = false,
): L.DivIcon {
  const group = groupDefinition(element.group);
  const status = statusDefinition(element.status);
  const classes = [
    'gf-pin',
    `gf-pin--${element.group.toLowerCase()}`,
    `gf-pin--status-${element.status.toLowerCase()}`,
    selected ? 'is-selected' : '',
    highlighted ? 'is-highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const html = `
    <span class="${classes}" style="--gf-pin-color:${escapeHtml(group.color)}">
      <span class="gf-pin__tip"></span>
      <span class="gf-pin__head"><span class="gf-pin__code">${escapeHtml(group.code)}</span></span>
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

/** Pré-visualização que acompanha o cursor na ferramenta "Adicionar elemento". */
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

/** Conteúdo do tooltip de um elemento. */
export function elementTooltipHtml(element: MapElement): string {
  const group = groupDefinition(element.group);
  const status = statusDefinition(element.status);
  return `<strong>${escapeHtml(element.name)}</strong><br>${escapeHtml(group.label)} · ${escapeHtml(status.label)}`;
}

export interface PopupContent {
  title: string;
  badge: { code: string; color: string };
  typeText: string;
  status: { label: string; color: string };
  details: readonly ElementDetail[];
  /** Linha extra (ex.: início e fim do cabo). */
  extra?: string | null;
  hint?: string | null;
  /** Botão "Toque aqui para editar" (`data-popup-action="edit"`); o `app-geo-map` ouve o clique. */
  action?: string | null;
}

/**
 * Balão de informações em linguagem simples. O HTML é gerado como texto (o Leaflet
 * injeta via `innerHTML`), por isso todos os valores passam por `escapeHtml`; a
 * aparência fica em `styles.scss`.
 */
export function popupHtml(content: PopupContent): string {
  const rows = content.details
    .filter((detail) => detail.label !== 'Tipo' && detail.label !== 'Situação')
    .map(
      (detail) =>
        `<p class="gf-popup__detail"><span>${escapeHtml(detail.label)}</span> ${escapeHtml(detail.value)}</p>`,
    )
    .join('');
  return `
    <div class="gf-popup">
      <p class="gf-popup__title">${escapeHtml(content.title)}</p>
      <p class="gf-popup__row">
        <span class="gf-popup__badge" style="background:${escapeHtml(content.badge.color)}">
          ${escapeHtml(content.badge.code)}
        </span>
        <span class="gf-popup__type">${escapeHtml(content.typeText)}</span>
      </p>
      <p class="gf-popup__meta">
        <span class="gf-popup__dot" style="background:${escapeHtml(content.status.color)}"></span>
        ${escapeHtml(content.status.label)}
      </p>
      ${rows}
      ${content.extra ? `<p class="gf-popup__detail">${escapeHtml(content.extra)}</p>` : ''}
      ${content.hint ? `<p class="gf-popup__hint">${escapeHtml(content.hint)}</p>` : ''}
      ${content.action ? `<button type="button" class="gf-popup__action" data-popup-action="edit">${escapeHtml(content.action)}</button>` : ''}
    </div>`;
}

/** Balão de um elemento selecionado no mapa. */
export function elementPopupHtml(
  element: MapElement,
  extra?: string | null,
  hint?: string | null,
  action?: string | null,
): string {
  const group = groupDefinition(element.group);
  const status = statusDefinition(element.status);
  return popupHtml({
    title: element.name,
    badge: { code: group.code, color: group.color },
    typeText: group.longLabel,
    status,
    details: element.details,
    extra,
    hint,
    action,
  });
}
