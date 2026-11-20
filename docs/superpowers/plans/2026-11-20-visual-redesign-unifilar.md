# Redesign Visual — Esquema Unifilar

> **Substituído** por `docs/superpowers/plans/2026-11-20-redesign-unifilar-app.md` (este foi executado só em parte).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar visual Esquema Unifilar em toda a interface: gavetas com linhas entrada→elemento→saída, ocupação visível, estado por forma de linha, paleta única, grade 4px.

**Architecture:** Componentes novos (diagram-line, state-line-style, occupancy-badge) + atualização de sheets existentes + tokens de cor e espaçamento unificados.

**Tech Stack:** Angular 22 (signals, OnPush), Angular Material, Vitest, TypeScript. TDD obrigatório.

**Spec:** `docs/DESIGN.md` (Esquema Unifilar); `docs/SPECS.md` (interface rules); `.impecable.md` (constraints de acessibilidade, cores, densidade).

## Global Constraints

- Sem git add/commit (usuário faz); listar arquivos e sugerir mensagem ao fim
- TDD: teste → RED → código → GREEN → suite completa
- Cores ópticas ABNT sempre presentes; estado também por forma de linha
- Touch targets 44×44px mín. (11 × 4px módulo)
- Grade 4px em todo padding/raio/altura
- Teste completo (`npm test --watch=false`) passa antes de cada commit
- Pts A/B de fibra só em modo avançado

## Review Focus

1. **Ocupação nunca escondida**: "3/12" ou "0/8" aparece sempre, não em expandível.
2. **Estado só pela forma**: Rompida/Reservada/Desativada = linha tracejada/riscada, não ícone extra.
3. **Entrada ≠ Saída (simetria)**: Entrada esquerda, saída direita, mesmo em mobile.
4. **Cores ABNT em toda a extensão**: Nenhuma fibra mostra sem cor (nem em placeholder).
5. **Drawer não rola com tabs**: Altura fixa, conteúdo interno scroll, abas sempre visíveis.

---

## Task 1: Regras de Estado por Forma de Linha

**Files:**
- Create: `src/app/core/network/line-state-style.ts` (regras puras)
- Create: `src/app/core/network/line-state-style.spec.ts` (testes)

**Interfaces:**
- Produces: `lineStyleByState(state: 'active'|'planned'|'disabled'): 'solid'|'dashed'|'dotted'`; retorna padrão CSS para SVG/canvas stroke-dasharray

- [ ] **Step 1: Write failing test for lineStyleByState**

```typescript
import { lineStyleByState } from './line-state-style';

describe('lineStyleByState', () => {
  it('returns solid for active', () => {
    const result = lineStyleByState('active');
    expect(result).toEqual({ dasharray: '', linecap: 'round' });
  });

  it('returns dashed for planned', () => {
    const result = lineStyleByState('planned');
    expect(result.dasharray).toContain('4');
  });

  it('returns dotted for disabled', () => {
    const result = lineStyleByState('disabled');
    expect(result.dasharray).toContain('1');
  });
});
```

- [ ] **Step 2: Run test to verify fails**

Run: `npm test --watch=false --include src/app/core/network/line-state-style.spec.ts`
Expected: FAIL — function not defined

- [ ] **Step 3: Implement `lineStyleByState` in `src/app/core/network/line-state-style.ts`**

Mapeie situação de rede (active, planned, disabled, broken, reserved) para dash pattern SVG. Retorne objeto com `dasharray` (string com números espaçados) e `linecap`.

```typescript
export type LineState = 'active' | 'planned' | 'disabled' | 'broken' | 'reserved';
export interface LineStyle { dasharray: string; linecap: 'round' | 'butt'; }

export function lineStyleByState(state: LineState): LineStyle {
  const patterns: Record<LineState, LineStyle> = {
    'active': { dasharray: '', linecap: 'round' },
    'planned': { dasharray: '4 4', linecap: 'round' },
    'disabled': { dasharray: '1 2', linecap: 'butt' },
    'broken': { dasharray: '1 2', linecap: 'butt' },
    'reserved': { dasharray: '4 4', linecap: 'round' }
  };
  return patterns[state];
}
```

- [ ] **Step 4: Run test to verify passes**

Run: `npm test --watch=false --include src/app/core/network/line-state-style.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/core/network/line-state-style.ts src/app/core/network/line-state-style.spec.ts
git commit -m "feat: add line state style rules (solid/dashed/dotted by situation)"
```

---

## Task 2: Componente DiagramLine (entrada → caixa → saída)

**Files:**
- Create: `src/app/shared/diagram/diagram-line.component.ts`
- Create: `src/app/shared/diagram/diagram-line.component.html`
- Create: `src/app/shared/diagram/diagram-line.component.scss`
- Create: `src/app/shared/diagram/diagram-line.component.spec.ts`

**Interfaces:**
- Consumes: `lineStyleByState` (Task 1)
- Produces: 
  - `DiagramLineComponent` (selector: `app-diagram-line`)
  - Input: `@input() entrance: { cable: string; tube: string; fiber: { name: string; number: number; color: string } }`
  - Input: `@input() box: { name: string; type: 'CTO'|'CEO'|'DIO' }`
  - Input: `@input() exit: { cable: string; tube: string; fiber: { name: string; number: number; color: string } }`
  - Input: `@input() state: 'active'|'planned'|'disabled'|'broken'|'reserved'`
  - Output: nenhum

- [ ] **Step 1: Write failing test for DiagramLineComponent render**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagramLineComponent } from './diagram-line.component';

describe('DiagramLineComponent', () => {
  let component: DiagramLineComponent;
  let fixture: ComponentFixture<DiagramLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramLineComponent]
    }).compileComponents();
    
    fixture = TestBed.createComponent(DiagramLineComponent);
    component = fixture.componentInstance;
    component.entrance = {
      cable: 'CABO-01',
      tube: 'Verde',
      fiber: { name: 'Verde', number: 1, color: '#2e9e44' }
    };
    component.box = { name: 'CTO-05', type: 'CTO' };
    component.exit = {
      cable: 'CABO-02',
      tube: 'Amarelo',
      fiber: { name: 'Amarelo', number: 2, color: '#fdd835' }
    };
    component.state = 'active';
    fixture.detectChanges();
  });

  it('renders entrance cable label', () => {
    const entrance = fixture.debugElement.query(el => el.name === 'entrance-label');
    expect(entrance.nativeElement.textContent).toContain('CABO-01');
  });

  it('renders box name', () => {
    const box = fixture.debugElement.query(el => el.nativeElement.textContent?.includes('CTO-05'));
    expect(box).toBeTruthy();
  });

  it('renders exit cable label', () => {
    const exit = fixture.debugElement.query(el => el.nativeElement.textContent?.includes('CABO-02'));
    expect(exit).toBeTruthy();
  });

  it('renders fiber colors', () => {
    const svg = fixture.debugElement.query(el => el.name === 'svg');
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify fails**

Run: `npm test --watch=false --include src/app/shared/diagram/diagram-line.component.spec.ts`
Expected: FAIL — component not defined

- [ ] **Step 3: Create component shell**

```typescript
// diagram-line.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lineStyleByState } from '../../core/network/line-state-style';

@Component({
  selector: 'app-diagram-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagram-line.component.html',
  styleUrls: ['./diagram-line.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagramLineComponent {
  entrance = input<{ cable: string; tube: string; fiber: FiberInfo }>();
  box = input<{ name: string; type: string }>();
  exit = input<{ cable: string; tube: string; fiber: FiberInfo }>();
  state = input<'active'|'planned'|'disabled'|'broken'|'reserved'>('active');

  protected lineStyle = computed(() => lineStyleByState(this.state()));
}
```

Template HTML (3 colunas):
```html
<div class="diagram-line">
  <div class="entrance">
    <span class="label" i18n>{{ entrance().cable }}</span>
    <div class="fiber" [style.background]="entrance().fiber.color">
      {{ entrance().fiber.number }}
    </div>
  </div>
  <svg class="connector" [attr.data-state]="state()">
    <line x1="0" y1="12" x2="100%" y2="12" [attr.stroke-dasharray]="lineStyle().dasharray" />
  </svg>
  <div class="box">{{ box().name }}</div>
  <svg class="connector" [attr.data-state]="state()">
    <line x1="0" y1="12" x2="100%" y2="12" [attr.stroke-dasharray]="lineStyle().dasharray" />
  </svg>
  <div class="exit">
    <span class="label" i18n>{{ exit().cable }}</span>
    <div class="fiber" [style.background]="exit().fiber.color">
      {{ exit().fiber.number }}
    </div>
  </div>
</div>
```

SCSS (3 colunas 1fr|1fr|1fr):
```scss
.diagram-line {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
  font-size: 12px;
}
.entrance, .exit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.fiber {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 11px;
  font-family: monospace;
  border: 1px solid rgba(0,0,0,0.2);
}
.box {
  font-weight: 600;
  padding: 6px 12px;
  background: #f4f6f8;
  border-radius: 4px;
  text-align: center;
}
.connector {
  width: 40px;
  height: 24px;
  line {
    stroke: #5d6b78;
    stroke-width: 1;
  }
}
```

- [ ] **Step 4: Run test to verify passes**

Run: `npm test --watch=false --include src/app/shared/diagram/diagram-line.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/diagram/
git commit -m "feat: add diagram-line component (entrada → caixa → saída)"
```

---

## Task 3: Badge de Ocupação

**Files:**
- Modify: `src/app/shared/common/occupancy-badge.component.ts` (ou criar novo)
- Modify: test

**Interfaces:**
- Consumes: nenhum
- Produces: `OccupancyBadgeComponent`; Input: `@input() occupied: number; @input() capacity: number`; renderiza "3/12 posições"

- [ ] **Step 1: Teste para ocupação**

```typescript
it('renders occupied/capacity', () => {
  component.occupied.set(3);
  component.capacity.set(12);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('3/12');
});
```

- [ ] **Step 2–4: Implementar componente**

HTML: `{{ occupied() }}/{{ capacity() }} posições`
SCSS: fonte 11px, cor #5d6b78, sem background

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/common/occupancy-badge.component.ts
git commit -m "feat: add occupancy-badge component (3/12 format)"
```

---

## Task 4: Atualizar BoxSheetStore + Templates

**Files:**
- Modify: `src/app/features/box-sheet/box-sheet-store.ts` (nenhuma mudança lógica; só dados)
- Modify: `src/app/features/box-sheet/box-sheet.component.html` (usar diagram-line + occupancy-badge)
- Modify: `src/app/features/box-sheet/box-sheet.component.scss` (grade 4px, gaveta nova)

**Interfaces:**
- Consumes: DiagramLineComponent, OccupancyBadgeComponent
- Produces: BoxSheetComponent renderiza com novo layout Esquema Unifilar

- [ ] **Step 1: Teste visual do layout**

```typescript
it('renders diagram-line for each splice', () => {
  // mock com 2 fusões
  const diagrams = fixture.debugElement.queryAll(By.directive(DiagramLineComponent));
  expect(diagrams.length).toBe(2);
});

it('shows occupancy badge in tab label', () => {
  expect(fixture.nativeElement.textContent).toContain('3/12');
});
```

- [ ] **Step 2–5: Adaptar template**

Gaveta:
- Titulo "CTO-05 · Ativa" com ícone
- Abas: Resumo / Fusões / Portas
- Para cada fusão: `<app-diagram-line>`
- Rodapé: `<app-occupancy-badge [occupied]="occupied" [capacity]="capacity">`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/box-sheet/
git commit -m "feat: update box sheet to unifilar diagram layout"
```

---

## Task 5: Paleta de Cores + Tema Escuro/Claro

**Files:**
- Modify: `src/styles.scss` (ou `src/assets/theme.scss`)
- Modify: `src/app/core/theme/` se existir

**Interfaces:**
- Produces: CSS tokens `--unifilar-*` com valores OKLCH

- [ ] **Teste de cores**

```scss
// Verificar que cores ABNT carregam
.test-fiber-verde { background: var(--fiber-verde); }
// Verde = #2e9e44
```

- [ ] **Implementar:**

```scss
:root {
  --unifilar-bg: #f4f6f8;
  --unifilar-text: #1e2731;
  --unifilar-secondary: #5d6b78;
  --unifilar-normal: #1f9d6b;
  --unifilar-alert: #d98a1c;
  --unifilar-critical: #d23c3c;
  
  // ABNT colors
  --fiber-verde: #2e9e44;
  --fiber-amarelo: #fdd835;
  --fiber-branco: #ffffff;
  --fiber-azul: #1e88e5;
  --fiber-vermelho: #e53935;
  --fiber-violeta: #8e24aa;
  --fiber-marrom: #795548;
  --fiber-rosa: #f48fb1;
  --fiber-preto: #212121;
  --fiber-cinza: #9e9e9e;
  --fiber-laranja: #fb8c00;
  --fiber-ciano: #00bcd4;
}

@media (prefers-color-scheme: dark) {
  :root {
    --unifilar-bg: #1e2731;
    --unifilar-text: #f4f6f8;
    // etc
  }
}
```

- [ ] **Commit**

```bash
git add src/styles.scss src/app/core/theme/
git commit -m "feat: add unifilar color palette and dark theme"
```

---

## Task 6: Validação e Testes de Integração

**Files:**
- Create: `src/app/features/network-map/e2e-visual.spec.ts`

- [ ] **Testes:**

- Mapa carrega, gaveta abre ao clicar em CTO
- Gaveta mostra diagrama entrada→saída
- Ocupação "3/12" visível
- Cores das fibras ABNT presentes
- Tema escuro funciona (preferência do sistema)
- Drawer não rola mas conteúdo interno scroll
- Touch target 44×44px mín.

- [ ] **Commit**

```bash
git add src/app/features/network-map/e2e-visual.spec.ts
git commit -m "test: add visual integration tests for unifilar layout"
```

---

## Task 7: Documentação (SPECS, GUIA, README, CLAUDE.md)

**Files:**
- Modify: `docs/SPECS.md` (adicionar regras UI RI-26...RI-30 sobre Esquema Unifilar)
- Modify: `docs/GUIA.md` (seção "Entender a Gaveta" com diagrama)
- Modify: `README.md` (atualizar captura de tela/descrição visual)
- Modify: `CLAUDE.md` (situação, próximos passos)

---

## Próximas etapas após implementação

1. Executar suite completa: `npm test --watch=false`
2. Build: `npx ng build`
3. Visual check no navegador: `npm start` → http://localhost:4200
4. Listar arquivos modificados e sugerir commit final
5. Aguardar aprovação visual do dono no navegador
6. Depois: implementação da tela de fusões (aprovada em 2026-11-20)
