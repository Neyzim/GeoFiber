import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagramLineComponent } from './diagram-line.component';
import { ChangeDetectionStrategy } from '@angular/core';

describe('DiagramLineComponent', () => {
  let component: DiagramLineComponent;
  let fixture: ComponentFixture<DiagramLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramLineComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramLineComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('entrance', {
      cable: 'CABO-01',
      tube: 'Verde',
      fiber: { name: 'Verde', number: 1, color: '#2e9e44' }
    });
    fixture.componentRef.setInput('box', { name: 'CTO-05', type: 'CTO' });
    fixture.componentRef.setInput('exit', {
      cable: 'CABO-02',
      tube: 'Amarelo',
      fiber: { name: 'Amarelo', number: 2, color: '#fdd835' }
    });
    fixture.componentRef.setInput('state', 'active');

    fixture.detectChanges();
  });

  it('renders entrance cable label', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('CABO-01');
  });

  it('renders box name', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('CTO-05');
  });

  it('renders exit cable label', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('CABO-02');
  });

  it('renders SVG connectors', () => {
    const svg = fixture.debugElement.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders fiber numbers', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1');
    expect(text).toContain('2');
  });
});
