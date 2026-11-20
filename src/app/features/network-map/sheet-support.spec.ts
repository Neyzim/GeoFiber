import { boxTabs } from './sheet-support';

describe('boxTabs', () => {
  it('returns Resumo and Portas for CTO without splice content', () => {
    const tabs = boxTabs('CTO', false);
    expect(tabs.map((t) => t.label)).toEqual(['Resumo', 'Portas']);
  });

  it('returns Resumo, Portas, and Fusões for CTO with splice content', () => {
    const tabs = boxTabs('CTO', true);
    expect(tabs.map((t) => t.label)).toEqual(['Resumo', 'Portas', 'Fusões']);
  });

  it('returns Resumo, Fusões, and Splitters for CEO', () => {
    const tabs = boxTabs('CEO', false);
    expect(tabs.map((t) => t.label)).toEqual(['Resumo', 'Fusões', 'Splitters']);
  });

  it('returns Resumo, Fusões, and Splitters for DIO', () => {
    const tabs = boxTabs('DIO', true);
    expect(tabs.map((t) => t.label)).toEqual(['Resumo', 'Fusões', 'Splitters']);
  });
});
