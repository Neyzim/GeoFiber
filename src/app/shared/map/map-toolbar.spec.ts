import { TestBed } from '@angular/core/testing';
import { MapToolbarComponent } from './map-toolbar';

function render(inputs: { roleLabel?: string } = {}) {
  TestBed.configureTestingModule({ imports: [MapToolbarComponent] });
  const fixture = TestBed.createComponent(MapToolbarComponent);
  fixture.componentRef.setInput('roleLabel', inputs.roleLabel ?? 'Técnico');
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const openMenu = () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-action="conta"]')!.click();
    fixture.detectChanges();
  };
  const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
  return { fixture, component, openMenu, overlay };
}

describe('MapToolbarComponent — conta', { timeout: 20000 }, () => {
  it('mostra o papel e Sair', () => {
    const { openMenu, overlay } = render();
    openMenu();
    expect(overlay().textContent).toContain('Técnico');
    expect(overlay().querySelector('[data-action="sair"]')).toBeTruthy();
  });

  it('Sair emite; usuários ficam no painel lateral, não no menu', () => {
    const { component, openMenu, overlay } = render({ roleLabel: 'Administrador' });
    const signedOut = vi.fn();
    component.signOut.subscribe(signedOut);
    openMenu();
    expect(overlay().textContent).toContain('Administrador');
    expect(overlay().textContent).not.toContain('usuários');
    overlay().querySelector<HTMLElement>('[data-action="sair"]')!.click();
    expect(signedOut).toHaveBeenCalled();
  });
});
