import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { TermHintComponent } from './term-hint';
import { ViewHelpDialogComponent } from './view-help-dialog';

describe('TermHintComponent', { timeout: 20000 }, () => {
  it('shows the short meaning and opens the glossary on the term', () => {
    const dialog = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TermHintComponent],
      providers: [{ provide: MatDialog, useValue: dialog }],
    });
    const fixture = TestBed.createComponent(TermHintComponent);
    fixture.componentRef.setInput('key', 'splitter');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-label')).toContain('Divide o sinal');
    button?.click();
    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { query: 'Splitter' } }));
  });

  it('renders nothing for an unknown term', () => {
    TestBed.configureTestingModule({ imports: [TermHintComponent] });
    const fixture = TestBed.createComponent(TermHintComponent);
    fixture.componentRef.setInput('key', 'nao-existe');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});

describe('ViewHelpDialogComponent', { timeout: 20000 }, () => {
  it('shows what is on screen and what colors mean', () => {
    TestBed.configureTestingModule({
      imports: [ViewHelpDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { summary: 'Você está vendo 1 OLT, sem cabos.' } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ViewHelpDialogComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Você está vendo 1 OLT, sem cabos.');
    expect(text).toContain('Caixa na rua, perto das casas');
    expect(text).toContain('Distribuição');
    expect(text).toContain('Clique num ponto ou numa linha');
  });
});
