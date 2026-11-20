import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OccupancyBadgeComponent } from './occupancy-badge.component';

describe('OccupancyBadgeComponent', () => {
  let component: OccupancyBadgeComponent;
  let fixture: ComponentFixture<OccupancyBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OccupancyBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OccupancyBadgeComponent);
    component = fixture.componentInstance;
  });

  it('renders occupied/capacity format', () => {
    fixture.componentRef.setInput('occupied', 3);
    fixture.componentRef.setInput('capacity', 12);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('3/12');
    expect(text).toContain('posições');
  });

  it('renders "0/8 posições" for empty', () => {
    fixture.componentRef.setInput('occupied', 0);
    fixture.componentRef.setInput('capacity', 8);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('0/8');
  });

  it('renders "12/12 posições" when full', () => {
    fixture.componentRef.setInput('occupied', 12);
    fixture.componentRef.setInput('capacity', 12);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12/12');
  });
});
