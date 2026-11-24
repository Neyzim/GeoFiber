import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FiberEnd } from '../../../core/api/api-types';
import { FiberIndex, FiberOption, fiberOptions } from '../../../core/network/box-interior';

export interface FiberSlot {
  label: string;
  defaultEnd: FiberEnd;
  /** Fibra já ligada (aparece mesmo com a ponta ocupada). */
  current?: string;
}

export interface FiberLinkData {
  title: string;
  intro?: string;
  slots: readonly FiberSlot[];
  fibers: FiberIndex;
  /** Bandejas para escolher (fusão). */
  trays?: readonly { number: number; label: string }[];
  showAttenuation?: boolean;
  confirmLabel?: string;
}

export interface FiberLinkResult {
  choices: { fiberId: string; fiberEnd: FiberEnd }[];
  trayNumber?: number;
  attenuationDb?: number;
}

type SlotForm = FormGroup<{
  fiberId: FormControl<string>;
  fiberEnd: FormControl<FiberEnd>;
}>;

/**
 * Escolha de fibras para fusão, conector, splitter ou porta. Só lista fibras dos cabos da caixa
 * com a ponta livre; as pontas A/B ficam no modo avançado, com os padrões do backend.
 */
@Component({
  selector: 'app-fiber-link-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './fiber-link-dialog.html',
  styleUrl: '../../../shared/network/network-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiberLinkDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<FiberLinkDialogComponent, FiberLinkResult>);
  protected readonly data = inject<FiberLinkData>(MAT_DIALOG_DATA);

  protected readonly ends: readonly FiberEnd[] = ['A', 'B'];
  protected readonly hasFibers = this.data.fibers.size > 0;
  protected readonly advanced = signal(false);
  readonly problem = signal<string | null>(null);

  readonly form = new FormGroup({
    slots: new FormArray<SlotForm>(
      this.data.slots.map(
        (slot) =>
          new FormGroup({
            fiberId: new FormControl(slot.current ?? '', {
              nonNullable: true,
              validators: Validators.required,
            }),
            fiberEnd: new FormControl<FiberEnd>(slot.defaultEnd, { nonNullable: true }),
          }),
      ),
    ),
    trayNumber: new FormControl<number | null>(this.data.trays?.[0]?.number ?? null),
    attenuationDb: new FormControl<number | null>(null, Validators.min(0)),
  });

  constructor() {
    // Trocar a ponta (modo avançado) limpa a fibra que deixou de estar livre nela.
    this.form.controls.slots.controls.forEach((slot, index) => {
      slot.controls.fiberEnd.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        const chosen = slot.controls.fiberId.value;
        if (chosen && !this.optionsFor(index).some((option) => option.id === chosen)) {
          slot.controls.fiberId.setValue('');
        }
      });
    });
  }

  toggleAdvanced(): void {
    this.advanced.update((value) => !value);
  }

  protected optionsFor(index: number): FiberOption[] {
    const slot = this.form.controls.slots.at(index);
    return fiberOptions(this.data.fibers, slot.controls.fiberEnd.value, this.data.slots[index].current);
  }

  submit(): void {
    this.problem.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.problem.set('Escolha as fibras.');
      return;
    }
    const choices = this.form.controls.slots.controls.map((slot) => slot.getRawValue());
    if (choices.length > 1 && new Set(choices.map((item) => item.fiberId)).size < choices.length) {
      this.problem.set('Escolha duas fibras diferentes.');
      return;
    }
    if (this.data.trays && this.form.controls.trayNumber.value === null) {
      this.problem.set('Escolha a bandeja.');
      return;
    }
    const result: FiberLinkResult = { choices };
    if (this.data.trays) result.trayNumber = this.form.controls.trayNumber.value ?? undefined;
    const attenuation = this.form.controls.attenuationDb.value;
    if (this.data.showAttenuation && attenuation !== null) result.attenuationDb = attenuation;
    this.dialogRef.close(result);
  }
}
