import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiberDotComponent } from './fiber-dot';

describe('FiberDotComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<FiberDotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiberDotComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FiberDotComponent);
  });

  function dot(): HTMLElement {
    return fixture.nativeElement.querySelector('.fiber-dot') as HTMLElement;
  }

  it('renders fiber number with correct color and ink', () => {
    fixture.componentRef.setInput('color', 'BLUE');
    fixture.componentRef.setInput('number', 4);
    fixture.detectChanges();

    expect(dot().textContent).toBe('4');
    expect(dot().getAttribute('aria-label')).toBe('Fibra 4 · Azul');
    expect(dot().getAttribute('title')).toBe('Fibra 4 · Azul');
    expect(dot().style.background).toBe('rgb(30, 136, 229)'); // #1e88e5
  });

  it('applies dark ink class for WHITE', () => {
    fixture.componentRef.setInput('color', 'WHITE');
    fixture.detectChanges();

    expect(dot().classList.contains('fiber-dot--ink-dark')).toBe(true);
  });

  it('applies light ink class for BLACK', () => {
    fixture.componentRef.setInput('color', 'BLACK');
    fixture.detectChanges();

    expect(dot().classList.contains('fiber-dot--ink-light')).toBe(true);
  });

  it('renders "tubo" in aria-label when kind is "tubo"', () => {
    fixture.componentRef.setInput('kind', 'tubo');
    fixture.componentRef.setInput('color', 'GREEN');
    fixture.componentRef.setInput('number', 1);
    fixture.detectChanges();

    expect(dot().getAttribute('aria-label')).toBe('Tubo 1 · Verde');
  });

  it('hides number in sm size, still in aria-label', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.componentRef.setInput('number', 2);
    fixture.detectChanges();

    expect(dot().classList.contains('fiber-dot--sm')).toBe(true);
    expect(dot().textContent).toBe('');
    expect(dot().getAttribute('aria-label')).toContain('2');
  });

  it('marks unknown color as unknown', () => {
    fixture.componentRef.setInput('color', undefined);
    fixture.componentRef.setInput('number', 3);
    fixture.detectChanges();

    expect(dot().classList.contains('fiber-dot--unknown')).toBe(true);
    expect(dot().getAttribute('aria-label')).toBe('Fibra 3 · cor desconhecida');
  });
});
