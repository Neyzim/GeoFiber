import { TestBed } from '@angular/core/testing';
import { DiagramLineComponent } from '../../shared/diagram/diagram-line.component';
import { OccupancyBadgeComponent } from '../../shared/common/occupancy-badge.component';

describe('Visual Redesign Integration (Esquema Unifilar)', () => {
  it('diagram-line renders entrance → box → exit', () => {
    TestBed.configureTestingModule({
      imports: [DiagramLineComponent]
    });
    const fixture = TestBed.createComponent(DiagramLineComponent);

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

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('CABO-01');
    expect(html).toContain('CTO-05');
    expect(html).toContain('CABO-02');
  });

  it('occupancy-badge formats 3/12 correctly', () => {
    TestBed.configureTestingModule({
      imports: [OccupancyBadgeComponent]
    });
    const fixture = TestBed.createComponent(OccupancyBadgeComponent);

    fixture.componentRef.setInput('occupied', 3);
    fixture.componentRef.setInput('capacity', 12);
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('3/12');
    expect(html).toContain('posições');
  });

  it('diagram renders different states with correct line styles', () => {
    TestBed.configureTestingModule({
      imports: [DiagramLineComponent]
    });
    const fixture = TestBed.createComponent(DiagramLineComponent);

    fixture.componentRef.setInput('entrance', {
      cable: 'C1',
      tube: 'T',
      fiber: { name: 'T', number: 1, color: '#fff' }
    });
    fixture.componentRef.setInput('box', { name: 'B', type: 'CTO' });
    fixture.componentRef.setInput('exit', {
      cable: 'C2',
      tube: 'T',
      fiber: { name: 'T', number: 1, color: '#fff' }
    });

    // Test active state (solid line)
    fixture.componentRef.setInput('state', 'active');
    fixture.detectChanges();
    let svg = fixture.debugElement.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();

    // Test planned state (dashed line)
    fixture.componentRef.setInput('state', 'planned');
    fixture.detectChanges();
    svg = fixture.debugElement.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('data-state')).toBe('planned');
  });

  it('fiber colors display without text-only fallback', () => {
    TestBed.configureTestingModule({
      imports: [DiagramLineComponent]
    });
    const fixture = TestBed.createComponent(DiagramLineComponent);

    fixture.componentRef.setInput('entrance', {
      cable: 'C1',
      tube: 'Verde',
      fiber: { name: 'Verde', number: 1, color: '#2e9e44' }
    });
    fixture.componentRef.setInput('box', { name: 'B', type: 'CTO' });
    fixture.componentRef.setInput('exit', {
      cable: 'C2',
      tube: 'Amarelo',
      fiber: { name: 'Amarelo', number: 2, color: '#fdd835' }
    });
    fixture.componentRef.setInput('state', 'active');
    fixture.detectChanges();

    const fibers = fixture.debugElement.nativeElement.querySelectorAll('.fiber');
    expect(fibers.length).toBe(2);
    expect(fibers[0].style.background).toBe('rgb(46, 158, 68)'); // #2e9e44
    expect(fibers[1].style.background).toBe('rgb(253, 216, 53)'); // #fdd835
  });
});
