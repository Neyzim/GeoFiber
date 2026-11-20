import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GLOSSARY } from '../../core/network/glossary';
import { GlossaryDialogComponent } from './glossary-dialog';

function setup(data: { query?: string } | null = null) {
  TestBed.configureTestingModule({
    imports: [GlossaryDialogComponent],
    providers: [{ provide: MAT_DIALOG_DATA, useValue: data }],
  });
  const fixture = TestBed.createComponent(GlossaryDialogComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

describe('GlossaryDialogComponent', { timeout: 20000 }, () => {
  it('lists every term and filters as the person types', () => {
    const { fixture, component } = setup();
    expect(component.results()).toHaveLength(GLOSSARY.length);
    component.query.set('fusao');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Emenda permanente');
  });

  it('opens already searching a term', () => {
    const { component } = setup({ query: 'splitter' });
    expect(component.results()[0].key).toBe('splitter');
  });

  it('says when nothing matches', () => {
    const { fixture, component } = setup();
    component.query.set('xyzxyz');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhum termo encontrado');
  });
});
