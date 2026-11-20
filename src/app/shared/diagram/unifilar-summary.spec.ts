import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnifilarSummaryComponent } from './unifilar-summary';

describe('UnifilarSummaryComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<UnifilarSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnifilarSummaryComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(UnifilarSummaryComponent);
  });

  it('shows first 3 incoming cables and +N count', () => {
    fixture.componentRef.setInput('code', 'TEST');
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('sides', {
      incoming: [{ label: 'C1' }, { label: 'C2' }, { label: 'C3' }, { label: 'C4' }, { label: 'C5' }],
      outgoing: [],
    });
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('C1');
    expect(html).toContain('C2');
    expect(html).toContain('C3');
    expect(html).toContain('+2');
    expect(html).not.toContain('C4');

    const ariaLabel = fixture.nativeElement.querySelector('[role="group"]').getAttribute('aria-label');
    expect(ariaLabel).toContain('C5');
  });

  it('shows empty messages when no cables', () => {
    fixture.componentRef.setInput('code', 'TEST');
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('sides', { incoming: [], outgoing: [] });
    fixture.componentRef.setInput('emptyIncoming', 'Origem do sinal');
    fixture.componentRef.setInput('emptyOutgoing', 'Nada sai daqui');
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Origem do sinal');
    expect(html).toContain('Nada sai daqui');
  });

  it('renders "Chega" and "Sai" labels', () => {
    fixture.componentRef.setInput('code', 'TEST');
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('sides', {
      incoming: [{ label: 'A' }],
      outgoing: [{ label: 'B' }],
    });
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Chega');
    expect(html).toContain('Sai');
    expect(html).toContain('TEST');
  });

  it('applies dash pattern to line when state is disabled', () => {
    fixture.componentRef.setInput('code', 'TEST');
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('sides', { incoming: [], outgoing: [] });
    fixture.componentRef.setInput('state', 'disabled');
    fixture.detectChanges();

    const lines: SVGLineElement[] = Array.from(fixture.nativeElement.querySelectorAll('line'));
    expect(lines.length).toBe(2);
    for (const line of lines) {
      expect(line.getAttribute('stroke-dasharray')).toBe('1 3');
      expect(line.getAttribute('stroke-linecap')).toBe('butt');
    }
  });

  it('draws a solid line when state is active', () => {
    fixture.componentRef.setInput('code', 'TEST');
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('sides', { incoming: [], outgoing: [] });
    fixture.detectChanges();

    const lines: SVGLineElement[] = Array.from(fixture.nativeElement.querySelectorAll('line'));
    for (const line of lines) {
      expect(line.hasAttribute('stroke-dasharray')).toBe(false);
    }
  });
});
