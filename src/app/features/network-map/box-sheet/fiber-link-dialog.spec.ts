import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { indexFibers } from '../../../core/network/box-interior';
import { FiberLinkData, FiberLinkDialogComponent } from './fiber-link-dialog';

const fibers = indexFibers([
  {
    cableId: 'c1',
    name: 'CABO-01',
    fibers: [
      { id: 'f1', tubeNumber: 1, numberInTube: 1, absoluteNumber: 1, status: 'AVAILABLE' },
      { id: 'f2', tubeNumber: 1, numberInTube: 2, absoluteNumber: 2, status: 'AVAILABLE' },
    ],
  },
]);

function setup(data: Partial<FiberLinkData> = {}) {
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    imports: [FiberLinkDialogComponent],
    providers: [
      { provide: MatDialogRef, useValue: dialogRef },
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          title: 'Nova fusão',
          fibers,
          slots: [
            { label: 'Fibra que chega', defaultEnd: 'B' },
            { label: 'Fibra que sai', defaultEnd: 'A' },
          ],
          trays: [{ number: 1, label: 'Bandeja 1 (0 de 12)' }],
          showAttenuation: true,
          ...data,
        } satisfies FiberLinkData,
      },
    ],
  });
  const fixture = TestBed.createComponent(FiberLinkDialogComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, dialogRef };
}

describe('FiberLinkDialogComponent', () => {
  it('returns the chosen fibers with the default ends', () => {
    const { component, dialogRef } = setup();
    component.form.controls.slots.at(0).controls.fiberId.setValue('f1');
    component.form.controls.slots.at(1).controls.fiberId.setValue('f2');
    component.form.controls.attenuationDb.setValue(0.05);
    component.submit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      choices: [
        { fiberId: 'f1', fiberEnd: 'B' },
        { fiberId: 'f2', fiberEnd: 'A' },
      ],
      trayNumber: 1,
      attenuationDb: 0.05,
    });
  });

  it('hides the ends until the advanced option is on', () => {
    const { component, fixture } = setup();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).not.toContain('Ponta da fibra');
    component.toggleAdvanced();
    fixture.detectChanges();
    expect(host.textContent).toContain('Ponta da fibra');
  });

  it('refuses the same fiber twice', () => {
    const { component, dialogRef } = setup();
    component.form.controls.slots.at(0).controls.fiberId.setValue('f1');
    component.form.controls.slots.at(1).controls.fiberId.setValue('f1');
    component.submit();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.problem()).toBe('Escolha duas fibras diferentes.');
  });

  it('explains when the box has no cable fibers', () => {
    const { fixture } = setup({ fibers: new Map() });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ligue um cabo a esta caixa na ficha do cabo',
    );
  });

  describe('changing the end (advanced mode)', () => {
    // f9: ponta B livre, ponta A já tem fusão.
    const halfBusy = indexFibers([
      {
        cableId: 'c1',
        name: 'CABO-01',
        fibers: [
          {
            id: 'f9',
            tubeNumber: 1,
            numberInTube: 3,
            absoluteNumber: 3,
            status: 'OCCUPIED',
            ends: [
              { end: 'A', status: 'CONNECTED', link: { type: 'FUSION', id: 's1', elementId: 'b1' } },
              { end: 'B', status: 'AVAILABLE' },
            ],
          },
          { id: 'f1', tubeNumber: 1, numberInTube: 1, absoluteNumber: 1, status: 'AVAILABLE' },
        ],
      },
    ]);
    const single = [{ label: 'Fibra que chega', defaultEnd: 'B' as const }];

    it('clears a fiber that is no longer free on the new end', () => {
      const { component } = setup({ fibers: halfBusy, slots: single, trays: undefined });
      const slot = component.form.controls.slots.at(0).controls;
      slot.fiberId.setValue('f9');
      slot.fiberEnd.setValue('A');
      expect(slot.fiberId.value).toBe('');
    });

    it('keeps a fiber that is free on both ends', () => {
      const { component } = setup({ fibers: halfBusy, slots: single, trays: undefined });
      const slot = component.form.controls.slots.at(0).controls;
      slot.fiberId.setValue('f1');
      slot.fiberEnd.setValue('A');
      expect(slot.fiberId.value).toBe('f1');
    });

    it('keeps the fiber that is already linked', () => {
      const { component } = setup({
        fibers: halfBusy,
        slots: [{ label: 'Fibra que chega', defaultEnd: 'B', current: 'f9' }],
        trays: undefined,
      });
      const slot = component.form.controls.slots.at(0).controls;
      slot.fiberEnd.setValue('A');
      expect(slot.fiberId.value).toBe('f9');
    });
  });
});
