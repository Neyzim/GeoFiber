import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { NetworkMapState } from '../../../core/network/network-map-state';
import { NetworkSidebarComponent } from './network-sidebar';

function render(isAdmin: boolean) {
  TestBed.configureTestingModule({
    imports: [NetworkSidebarComponent],
    providers: [
      provideRouter([]),
      { provide: NetworkMapState, useValue: { canEdit: signal(true) } },
      { provide: AuthSession, useValue: { isAdmin: signal(isAdmin) } },
    ],
  });
  const fixture = TestBed.createComponent(NetworkSidebarComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('NetworkSidebarComponent', { timeout: 20000 }, () => {
  it('começa recolhido', () => {
    const root = render(true);
    expect(root.querySelector('aside.sidebar')!.classList).toContain('is-collapsed');
  });

  it('recolhido, o administrador ainda alcança Importar e Usuários pelos ícones', () => {
    const root = render(true);
    expect(root.querySelector('a[href="/importar"][aria-label="Importar KMZ/KML"]')).toBeTruthy();
    expect(root.querySelector('a[href="/usuarios"][aria-label="Usuários"]')).toBeTruthy();
  });

  it('administrador vê Usuários junto de Importar KMZ/KML no painel aberto', () => {
    const root = render(true);
    expand(root);
    const link = root.querySelector<HTMLAnchorElement>('a[href="/usuarios"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Usuários');
    expect(root.querySelector('a[href="/importar"]')).toBeTruthy();
  });

  it('técnico não vê Usuários, nem recolhido nem aberto', () => {
    const root = render(false);
    expect(root.querySelector('a[href="/usuarios"]')).toBeNull();
    expand(root);
    expect(root.querySelector('a[href="/usuarios"]')).toBeNull();
    expect(root.querySelector('a[href="/importar"]')).toBeTruthy();
  });

  it('no celular o botão recolhido é o ☰ (menu)', () => {
    const root = render(true);
    const toggle = root.querySelector('button[aria-label="Expandir painel"]')!;
    expect(toggle.classList).toContain('sidebar__toggle');
    expect(toggle.querySelector('.sidebar__toggle-mobile')!.textContent).toContain('menu');
  });

  it('aberto, tocar fora do painel (no fundo) recolhe', () => {
    const root = render(true);
    expect(root.querySelector('.sidebar__backdrop')).toBeNull();
    expand(root);
    root.querySelector<HTMLButtonElement>('.sidebar__backdrop')!.click();
    TestBed.inject(ApplicationRef).tick();
    expect(root.querySelector('aside.sidebar')!.classList).toContain('is-collapsed');
  });
});

function expand(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('button[aria-label="Expandir painel"]')!.click();
  TestBed.inject(ApplicationRef).tick();
}
