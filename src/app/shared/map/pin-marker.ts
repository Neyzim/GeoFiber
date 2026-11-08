import * as L from 'leaflet';
import { NetworkModel, networkModelSummary, resolveElementColor } from '../../core/models/network-model.model';
import { Pin, pinStatusDefinition, pinTypeDefinition } from '../../core/models/pin.model';

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
export function createPinIcon(
  pin: Pin,
  selected = false,
  model?: NetworkModel | null,
): L.DivIcon {
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

  const color = resolveElementColor(pin.color, model, type.color);

  const html = `
    <span class="${classes}" style="--gf-pin-color:${escapeHtml(color)}">
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
export function pinTooltipHtml(pin: Pin, model?: NetworkModel | null): string {
  const type = pinTypeDefinition(pin.type);
  const status = pinStatusDefinition(pin.status);
  const label = model ? `${type.label} · ${model.name}` : type.label;
  return `<strong>${escapeHtml(pin.name)}</strong><br>${escapeHtml(label)} · ${escapeHtml(status.label)}`;
}

/**
 * Conteúdo do balão de informações exibido ao selecionar um PIN no mapa.
 *
 * O HTML é gerado como texto (o Leaflet injeta via `innerHTML`), por isso os
 * valores dinâmicos passam por `escapeHtml`; a aparência fica em `styles.scss`.
 */
export function pinPopupHtml(pin: Pin, model?: NetworkModel | null): string {
  const type = pinTypeDefinition(pin.type);
  const status = pinStatusDefinition(pin.status);
  const color = resolveElementColor(pin.color, model, type.color);
  const typeText = model ? `${type.label} · ${model.name}` : type.label;
  const summary = model ? networkModelSummary(model) : '';

  return `
    <div class="gf-popup">
      <p class="gf-popup__title">${escapeHtml(pin.name)}</p>
      <p class="gf-popup__row">
        <span class="gf-popup__badge" style="background:${escapeHtml(color)}">
          ${escapeHtml(model?.code ?? type.code)}
        </span>
        <span class="gf-popup__type">${escapeHtml(typeText)}</span>
      </p>
      <p class="gf-popup__meta">
        <span class="gf-popup__dot" style="background:${escapeHtml(status.color)}"></span>
        ${escapeHtml(status.label)}${summary ? ` · ${escapeHtml(summary)}` : ''}
      </p>
      <p class="gf-popup__hint">Clique novamente para editar</p>
    </div>`;
}
