import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiberRow } from '../../core/network/fiber-destinations';
import { SPLITTER, diagramCables } from '../../../testing/fiber-diagram-fixtures';
import { FiberListComponent } from './fiber-list';

describe('FiberListComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<FiberListComponent>;

  function render(blocked: ReadonlyMap<string, string> = new Map()) {
    TestBed.configureTestingModule({ imports: [FiberListComponent] });
    fixture = TestBed.createComponent(FiberListComponent);
    fixture.componentRef.setInput('cables', diagramCables());
    fixture.componentRef.setInput('splitters', [SPLITTER]);
    fixture.componentRef.setInput('blocked', blocked);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const texts = (selector: string) =>
    Array.from(el().querySelectorAll(selector)).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
  const click = (selector: string) => {
    el().querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  };

  it('uma aba por cabo com o papel e a aba Splitters quando houver', () => {
    render();
    expect(texts('[data-cable-tab]')).toEqual([
      'CABO-01 · chega aqui',
      'BACKBONE · passa por aqui',
      'DROP · sai daqui',
      'Splitters',
    ]);
  });

  it('mostra as fibras do cabo da aba com a cor e o destino', () => {
    render();
    const rows = texts('[data-fiber]');
    expect(rows[0]).toContain('1 Verde');
    expect(rows[0]).toContain('→ BACKBONE · Verde 1');
    expect(rows[1]).toContain('2 Amarelo');
    expect(rows[1]).toContain('livre');
    click('[data-cable-tab="c2"]');
    expect(texts('[data-fiber]')[0]).toContain('→ CABO-01 · Verde 1');
  });

  it('o cabeçalho do tubo recolhe e abre as fibras', () => {
    render();
    expect(texts('[data-tube]')[0]).toContain('Tubo Verde');
    expect(texts('[data-tube]')[0]).toContain('1/2 em uso');
    expect(el().querySelectorAll('[data-fiber]').length).toBe(3);
    click('[data-tube="1"]');
    expect(el().querySelectorAll('[data-fiber]').length).toBe(1);
    click('[data-tube="1"]');
    expect(el().querySelectorAll('[data-fiber]').length).toBe(3);
  });

  it('tocar numa fibra emite a linha', () => {
    render();
    const taps: FiberRow[] = [];
    fixture.componentInstance.fiberTap.subscribe((row) => taps.push(row));
    click('[data-fiber="c1f2"]');
    expect(taps.map((row) => row.fiber.id)).toEqual(['c1f2']);
  });

  it('no modo escolher, fibra bloqueada fica desabilitada com o motivo', () => {
    render(new Map([['c1f1', 'já emendada na bandeja 1, posição 3']]));
    const button = el().querySelector<HTMLButtonElement>('[data-fiber="c1f1"]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('já emendada na bandeja 1, posição 3');
  });

  it('cabo vazio mostra a frase e Abrir ficha do cabo', () => {
    render();
    const opened: string[] = [];
    fixture.componentInstance.openCable.subscribe((id) => opened.push(id));
    click('[data-cable-tab="c3"]');
    expect(el().textContent).toContain('Este cabo ainda não tem fibras.');
    click('[data-action="abrir-cabo"]');
    expect(opened).toEqual(['c3']);
  });

  it('aba Splitters lista entrada e saídas; tocar emite o splitter', () => {
    render();
    const taps: string[] = [];
    fixture.componentInstance.splitterTap.subscribe((id) => taps.push(id));
    click('[data-cable-tab="splitters"]');
    const text = texts('[data-splitter]')[0] ?? '';
    expect(text).toContain('Splitter 1:16');
    expect(text).toContain('Entrada: CABO-01 · Verde 2');
    expect(text).toContain('1 de 2 saídas em uso');
    click('[data-splitter="sp1"]');
    expect(taps).toEqual(['sp1']);
  });
});
