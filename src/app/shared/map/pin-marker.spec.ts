import { MapElement } from '../../core/network/map-element';
import { createElementIcon, elementPopupHtml, elementTooltipHtml, plainPopup } from './pin-marker';

const cto: MapElement = {
  key: 'box:b1',
  kind: 'box',
  id: 'b1',
  group: 'CTO',
  name: 'CTO-01',
  status: 'ACTIVE',
  position: { lat: 0, lng: 0 },
  details: [{ label: 'Portas de atendimento', value: '8' }],
};

describe('pin-marker', () => {
  it('draws the group code, group color and status color', () => {
    const html = String(createElementIcon(cto, false).options.html);
    expect(html).toContain('CTO');
    expect(html).toContain('#fb8c00');
    expect(html).toContain('var(--gf-status-normal)');
    expect(html).not.toContain('is-selected');
  });

  it('marks the selected element', () => {
    expect(String(createElementIcon(cto, true).options.html)).toContain('is-selected');
  });

  it('rings the elements of the open cable', () => {
    expect(String(createElementIcon(cto, false, true).options.html)).toContain('is-highlighted');
    expect(String(createElementIcon(cto, false).options.html)).not.toContain('is-highlighted');
  });

  it('escapes the name in the tooltip', () => {
    expect(elementTooltipHtml({ ...cto, name: '<b>x</b>' })).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('lists the details and the extra line in the popup', () => {
    const html = elementPopupHtml(cto, 'De A para B');
    expect(html).toContain('Portas de atendimento');
    expect(html).toContain('De A para B');
  });

  it('o balão pode ter o botão "Toque aqui para editar"', () => {
    const html = elementPopupHtml(cto, null, null, 'Toque aqui para editar');
    const box = document.createElement('div');
    box.innerHTML = html;
    const button = box.querySelector<HTMLButtonElement>('button[data-popup-action="edit"]');
    expect(button?.type).toBe('button');
    expect(button?.textContent?.trim()).toBe('Toque aqui para editar');
  });

  it('sem ação, o balão não tem botão', () => {
    const box = document.createElement('div');
    box.innerHTML = elementPopupHtml(cto);
    expect(box.querySelector('button')).toBeNull();
  });
});

describe('plainPopup', () => {
  it('shows a name as text, never as HTML', () => {
    const html = plainPopup('<img src=x onerror="alert(1)">CTO & cia');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;CTO &amp; cia');
  });
});
