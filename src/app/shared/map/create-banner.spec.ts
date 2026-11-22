import { TestBed } from '@angular/core/testing';
import { CreateBannerComponent } from './create-banner';

function render(label: string) {
  const fixture = TestBed.createComponent(CreateBannerComponent);
  fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture;
}

describe('CreateBannerComponent', { timeout: 20000 }, () => {
  it('mostra "Criar CTO"', () => {
    const root = render('CTO').nativeElement as HTMLElement;
    expect(root.querySelector('[data-action="reabrir"]')?.textContent).toContain('Criar CTO');
  });

  it('tocar na faixa reabre a escolha do tipo', () => {
    const fixture = render('CTO');
    let reopened = 0;
    fixture.componentInstance.reopen.subscribe(() => reopened++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-action="reabrir"]')!.click();
    expect(reopened).toBe(1);
  });

  it('o X encerra a criação', () => {
    const fixture = render('cabo de distribuição');
    let cancelled = 0;
    fixture.componentInstance.cancel.subscribe(() => cancelled++);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('button[aria-label="Encerrar criação"]')!.click();
    expect(cancelled).toBe(1);
  });
});
