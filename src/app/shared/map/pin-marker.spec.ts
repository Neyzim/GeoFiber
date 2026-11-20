import { MapElement } from '../../core/network/map-element';
import { createElementIcon, elementPopupHtml, elementTooltipHtml } from './pin-marker';

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
});
