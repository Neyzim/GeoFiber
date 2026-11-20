import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagramLineComponent } from './diagram-line.component';

describe('DiagramLineComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<DiagramLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramLineComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DiagramLineComponent);
  });

  it('renders entrada → middle → saída in a grid', () => {
    fixture.componentRef.setInput('entrada', {
      cable: 'CABO-01',
      tubeColor: 'YELLOW',
      tubeNumber: 1,
      fiberColor: 'GREEN',
      fiberNumber: 3,
    });
    fixture.componentRef.setInput('middle', {
      type: 'splice',
      positionNumber: 5,
      attenuationDb: 0.05,
    });
    fixture.componentRef.setInput('saida', {
      cable: 'CABO-02',
      tubeColor: 'BLUE',
      tubeNumber: 2,
      fiberColor: 'RED',
      fiberNumber: 7,
    });
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('CABO-01');
    expect(html).toContain('CABO-02');
    expect(html).toContain('Posição 5');
    expect(html).toContain('0,05 dB'); // pt-BR locale
    expect(fixture.nativeElement.querySelectorAll('app-fiber-dot').length).toBe(4);
  });

  it('shows connector type instead of position', () => {
    fixture.componentRef.setInput('middle', { type: 'connector' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Conector');
    expect(fixture.nativeElement.textContent).not.toContain('Posição');
  });

  it('shows aria-label with full description', () => {
    fixture.componentRef.setInput('entrada', {
      cable: 'CABO-01',
      tubeColor: 'GREEN',
      tubeNumber: 1,
      fiberColor: 'BLUE',
      fiberNumber: 3,
    });
    fixture.componentRef.setInput('middle', {
      type: 'splice',
      positionNumber: 1,
      attenuationDb: undefined,
    });
    fixture.componentRef.setInput('saida', {
      cable: 'CABO-02',
      fiberColor: 'YELLOW',
      fiberNumber: 1,
    });
    fixture.detectChanges();

    const ariaLabel = fixture.nativeElement
      .querySelector('[role="group"]')
      .getAttribute('aria-label');
    expect(ariaLabel).toContain('Entrada:');
    expect(ariaLabel).toContain('Posição 1');
    expect(ariaLabel).toContain('Saída:');
    // Sem códigos do backend na tela.
    expect(ariaLabel).toContain('Verde');
    expect(ariaLabel).not.toMatch(/GREEN|BLUE|YELLOW/);
  });

  it('says nothing is connected when a side is missing', () => {
    fixture.componentRef.setInput('middle', { type: 'connector' });
    fixture.detectChanges();

    const ariaLabel = fixture.nativeElement
      .querySelector('[role="group"]')
      .getAttribute('aria-label');
    expect(ariaLabel).toContain('Entrada: nada ligado');
    expect(ariaLabel).toContain('Saída: nada ligado');
  });
});
