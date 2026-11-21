import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TraceApi } from '../../core/api/resources/trace-api';
import { TraceDirection, TraceKind, TraceResponse } from '../../core/api/trace-types';
import { TraceSheetComponent } from './trace-sheet';
import { TraceStore } from './trace-store';

describe('TraceSheetComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<TraceSheetComponent>;
  let calls: { kind: TraceKind; id: string; direction: TraceDirection }[];
  let answer: (kind: TraceKind, id: string, direction: TraceDirection) => Observable<TraceResponse>;

  function render(response: TraceResponse | 'notFound' = { status: 'REACHED_OLT', steps: [], breaks: [] }) {
    answer = () =>
      response === 'notFound'
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : of(response);
    TestBed.configureTestingModule({
      imports: [TraceSheetComponent],
      providers: [
        TraceStore,
        {
          provide: TraceApi,
          useValue: {
            trace: (kind: TraceKind, id: string, direction: TraceDirection) => {
              calls.push({ kind, id, direction });
              return answer(kind, id, direction);
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TraceSheetComponent);
    return fixture;
  }

  function open(kind: TraceKind, id: string) {
    fixture.componentInstance.store.open(kind, id);
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    calls = [];
  });

  it('mostra o título, a situação e os passos em ordem com cor e tubo da fibra', () => {
    render({
      status: 'REACHED_OLT',
      steps: [
        { kind: 'CABLE', id: 'c1', label: 'CABO-DIST-01', fiber: { color: 'YELLOW', number: 2, tube: 'GREEN' } },
        { kind: 'BOX', id: 'b1', label: 'CEO-01', position: { tray: 1, number: 4 } },
        { kind: 'OLT_PORT', id: 'o1', label: 'OLT-CENTRAL · placa 1 · porta 3' },
      ],
      breaks: [],
    });
    open('BOX', 'b1');

    expect(el().querySelector('h2')?.textContent).toContain('Por onde passa o sinal');
    expect(el().querySelector('[data-headline]')?.textContent).toContain('Chega à OLT');
    const steps = Array.from(el().querySelectorAll('[data-step]')).map((li) =>
      Array.from(li.children).map((child) => child.textContent?.trim()).join(' '),
    );
    expect(steps[0]).toBe('Cabo CABO-DIST-01 Fibra 2 (Amarelo) do tubo Verde');
    expect(steps[1]).toBe('Caixa CEO-01 Bandeja 1 · posição 4');
    expect(steps[2]).toBe('Porta da OLT OLT-CENTRAL · placa 1 · porta 3');
  });

  it('mostra cada quebra com a frase do motivo e o item onde parou', () => {
    render({
      status: 'BROKEN',
      steps: [],
      breaks: [{ reason: 'NO_CONNECTION', at: { kind: 'FIBER_END', id: 'f', label: 'CABO-DIST-02 · fibra 5 · ponta B' } }],
    });
    open('FIBER', 'f');

    const broken = el().querySelector('[data-break]')?.textContent?.replace(/\s+/g, ' ');
    expect(broken).toContain('Esta ponta não está ligada a nada.');
    expect(broken).toContain('CABO-DIST-02 · fibra 5 · ponta B');
  });

  it('mostra a frase de 404 quando o item não existe', () => {
    render('notFound');
    open('BOX', 'sumiu');

    const alert = el().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não encontramos este item na rede.');
  });

  it('sem saída aberta, Voltar devolve a tela à origem do rastreio', () => {
    render();
    fixture.componentRef.setInput('hasOrigin', true);
    open('FIBER', 'f1');
    let left = 0;
    fixture.componentInstance.leave.subscribe(() => left++);

    el().querySelector<HTMLButtonElement>('[data-back]')?.click();
    expect(left).toBe(1);
  });

  it('sem origem e sem saída aberta, o botão Voltar não aparece', () => {
    render();
    open('FIBER', 'f1');
    expect(el().querySelector('[data-back]')).toBeNull();
  });

  it('troca o sentido e refaz a consulta', () => {
    render();
    open('BOX', 'b1');
    const button = el().querySelector<HTMLButtonElement>('[data-direction="DOWNSTREAM"]');
    button?.click();
    fixture.detectChanges();

    expect(calls.at(-1)).toEqual({ kind: 'BOX', id: 'b1', direction: 'DOWNSTREAM' });
  });

  it('no splitter descendo, mostra o resumo e abre a saída com clientes', () => {
    render({
      status: 'REACHED_CUSTOMERS',
      steps: [],
      breaks: [],
      branches: [
        { outputNumber: 1, status: 'CUSTOMERS', customerCount: 4, traceRef: 'porta-1' },
        { outputNumber: 2, status: 'FREE', customerCount: 0 },
      ],
    });
    fixture.componentInstance.store.open('SPLITTER', 's1', 'DOWNSTREAM');
    fixture.detectChanges();

    expect(el().querySelector('[data-splitter-summary]')?.textContent).toContain('2 saídas: 1 com cliente, 1 livres');
    const branches = Array.from(el().querySelectorAll('[data-branch] > span')).map((s) => s.textContent?.trim());
    expect(branches).toEqual(['Saída 1: 4 clientes', 'Saída 2: livre']);

    el().querySelector<HTMLButtonElement>('[data-branch-open]')?.click();
    fixture.detectChanges();
    expect(calls.at(-1)).toEqual({ kind: 'SPLITTER_PORT', id: 'porta-1', direction: 'DOWNSTREAM' });
  });

  it('splitter sem saída ligada mostra a frase e não a lista vazia', () => {
    render({ status: 'EMPTY', steps: [], breaks: [], branches: [] });
    fixture.componentInstance.store.open('SPLITTER', 's1', 'DOWNSTREAM');
    fixture.detectChanges();

    expect(el().querySelector('[data-splitter-summary]')?.textContent).toContain('Nenhuma saída ligada ainda');
    expect(el().querySelectorAll('[data-branch]').length).toBe(0);
  });
});
