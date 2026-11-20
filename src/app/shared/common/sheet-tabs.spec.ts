import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SheetTabsComponent } from './sheet-tabs';

describe('SheetTabsComponent', { timeout: 20000 }, () => {
  let fixture: ComponentFixture<SheetTabsComponent>;

  const tabs = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'fibras', label: 'Fibras' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SheetTabsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SheetTabsComponent);
    fixture.componentRef.setInput('tabs', tabs);
    fixture.componentRef.setInput('active', 'resumo');
    fixture.detectChanges();
  });

  it('renders tabs with role=tablist', () => {
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();

    const rendered = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(rendered.length).toBe(2);
    expect(rendered[0].textContent).toBe('Resumo');
    expect(rendered[1].textContent).toBe('Fibras');
  });

  it('marks the active tab with aria-selected=true', () => {
    const rendered = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(rendered[0].getAttribute('aria-selected')).toBe('true');
    expect(rendered[1].getAttribute('aria-selected')).toBe('false');
  });

  it('updates active when clicking a tab', () => {
    const secondTab = fixture.nativeElement.querySelector('[data-tab="fibras"]') as HTMLElement;
    secondTab.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.active()).toBe('fibras');
    expect(secondTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows the correct data-tab attribute', () => {
    expect(fixture.nativeElement.querySelector('[data-tab="resumo"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-tab="fibras"]')).toBeTruthy();
  });
});
