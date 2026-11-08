import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CABLE_TYPES, CableType, cableTypeDefinition } from '../../core/models/cable.model';
import {
  CTO_PORTS,
  CtoPorts,
  FIBER_OPTIONS,
  NETWORK_MODEL_KINDS,
  NetworkModel,
  NetworkModelDraft,
  NetworkModelKind,
  isNetworkModelKind,
} from '../../core/models/network-model.model';
import { NetworkModelStoreService } from '../../core/services/network-model-store';

export interface ModelFormDialogData {
  /** Modelo em edição; ausente no cadastro de um novo modelo. */
  model?: NetworkModel;
  /** Categoria pré-selecionada ao criar. */
  kind?: NetworkModelKind;
}

/** Opções de tracejado oferecidas no cadastro de cabos. */
const DASH_PRESETS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Linha contínua' },
  { value: '12 7', label: 'Traço longo' },
  { value: '6 6', label: 'Traço médio' },
  { value: '2 7', label: 'Pontilhado' },
];

/** Valor do formulário já normalizado (sem campos opcionais ausentes). */
interface ModelFormValue {
  kind: NetworkModelKind;
  name: string;
  code: string;
  color: string;
  description: string;
  category: CableType;
  fibers: number;
  weight: number;
  dashArray: string;
  ports: CtoPorts;
  splices: number;
}

/** Cadastro/edição de um modelo de cabo, CTO ou CEO. */
@Component({
  selector: 'app-model-form-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './model-form-dialog.html',
  styleUrl: './model-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelFormDialogComponent {
  protected readonly data = inject<ModelFormDialogData>(MAT_DIALOG_DATA);
  protected readonly kinds = NETWORK_MODEL_KINDS;
  protected readonly cableTypes = CABLE_TYPES;
  protected readonly fiberOptions = FIBER_OPTIONS;
  protected readonly portOptions = CTO_PORTS;
  protected readonly dashPresets = DASH_PRESETS;

  private readonly store = inject(NetworkModelStoreService);
  private readonly dialogRef = inject(MatDialogRef<ModelFormDialogComponent, NetworkModelDraft>);
  private readonly formBuilder = inject(FormBuilder);
  private readonly lastCode = signal('');
  private readonly lastName = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    kind: [(this.data.model?.kind ?? this.data.kind ?? 'cabo') as NetworkModelKind, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(60)]],
    code: ['', [Validators.required, Validators.maxLength(12)]],
    color: ['#5c6bc0', [Validators.required]],
    description: ['', [Validators.maxLength(200)]],
    category: ['backbone' as CableType],
    fibers: [12],
    weight: [4, [Validators.min(1), Validators.max(12)]],
    dashArray: [''],
    ports: ['1x16' as CtoPorts],
    splices: [12, [Validators.min(1), Validators.max(288)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly value = computed<ModelFormValue>(() => {
    const current = this.formValue();
    return {
      kind: current.kind ?? 'cabo',
      name: current.name ?? '',
      code: current.code ?? '',
      color: current.color ?? '',
      description: current.description ?? '',
      category: current.category ?? 'backbone',
      fibers: current.fibers ?? 12,
      weight: current.weight ?? 4,
      dashArray: current.dashArray ?? '',
      ports: current.ports ?? '1x16',
      splices: current.splices ?? 12,
    };
  });

  protected readonly title = this.data.model ? 'Editar modelo' : 'Novo modelo';
  protected readonly submitLabel = this.data.model ? 'Salvar alterações' : 'Cadastrar modelo';

  protected readonly selectedKind = computed(() => this.value().kind);
  protected readonly previewColor = computed(() => this.value().color || '#5c6bc0');
  protected readonly summaryText = computed(() => {
    const current = this.value();
    if (current.kind === 'cabo') {
      return `${cableTypeDefinition(current.category).label} · ${current.fibers} fibras · espessura ${current.weight}`;
    }
    if (current.kind === 'cto') {
      return `Divisor óptico ${current.ports}`;
    }
    return `${current.splices} posições de emenda`;
  });

  constructor() {
    const model = this.data.model;
    if (model) {
      this.form.patchValue({
        kind: model.kind,
        name: model.name,
        code: model.code,
        color: model.color,
        description: model.description,
        category: model.category ?? 'backbone',
        fibers: model.fibers ?? 12,
        weight: model.weight ?? 4,
        dashArray: model.dashArray ?? '',
        ports: model.ports ?? '1x16',
        splices: model.splices ?? 12,
      });
      this.lastCode.set(model.code);
      this.lastName.set(model.name);
      return;
    }
    this.syncSuggestions();
  }

  /** Troca a categoria do modelo e recalcula as sugestões. */
  protected onKindChange(kind: NetworkModelKind): void {
    if (!isNetworkModelKind(kind)) {
      return;
    }
    this.syncSuggestions();
  }

  /** Recalcula código/nome sugeridos após alterar um parâmetro. */
  protected onDependentChange(): void {
    this.syncSuggestions();
  }

  protected onColorInput(event: Event): void {
    this.form.controls.color.setValue((event.target as HTMLInputElement).value);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const current = this.value();
    const draft: NetworkModelDraft = {
      kind: current.kind,
      name: current.name.trim(),
      code: current.code.trim().toUpperCase(),
      color: current.color,
      description: current.description.trim(),
      category: current.kind === 'cabo' ? current.category : undefined,
      fibers: current.kind === 'cabo' ? current.fibers : undefined,
      weight: current.kind === 'cabo' ? current.weight : undefined,
      dashArray: current.kind === 'cabo' ? current.dashArray.trim() || undefined : undefined,
      ports: current.kind === 'cto' ? current.ports : undefined,
      splices: current.kind === 'ceo' ? current.splices : undefined,
    };
    this.dialogRef.close(draft);
  }

  /** Mantém código e nome alinhados aos parâmetros enquanto o usuário não os edita. */
  private syncSuggestions(): void {
    const current = this.value();
    const code = this.store.suggestCode(current.kind, {
      category: current.category,
      fibers: current.fibers,
      ports: current.ports,
      splices: current.splices,
    });
    const name = this.suggestedName(current);

    if (!this.form.controls.code.value.trim() || this.form.controls.code.value.toUpperCase() === this.lastCode()) {
      this.form.controls.code.setValue(code);
    }
    if (!this.form.controls.name.value.trim() || this.form.controls.name.value === this.lastName()) {
      this.form.controls.name.setValue(name);
    }

    this.lastCode.set(code);
    this.lastName.set(name);
  }

  private suggestedName(current: ModelFormValue): string {
    if (current.kind === 'cabo') {
      return `${cableTypeDefinition(current.category).label} ${current.fibers} fibras`;
    }
    if (current.kind === 'cto') {
      return `CTO ${current.ports}`;
    }
    return `CEO ${current.splices} emendas`;
  }
}
