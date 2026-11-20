# Redesign "Esquema Unifilar" na aplicação inteira — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o visual "Esquema Unifilar" escolhido no Impeccable em toda a interface: tokens de cor/forma/fonte com tema claro e escuro funcionando, fichas com linha "chega → elemento → sai", abas, diagrama por emenda, ocupação sempre visível, mapa e painéis no mesmo estilo.

**Architecture:** Um arquivo de tokens (`src/theme/_tokens.scss`) é a fonte única de cores, raios, sombra e fontes, e reaponta os tokens do Angular Material para ele. Regras puras novas em `core/network` (`occupancy.ts`, `unifilar.ts`, ampliação de `line-state-style.ts` e `box-interior.ts`) alimentam componentes pequenos em `shared/` (`app-fiber-dot`, `app-occupancy-badge`, `app-diagram-line`, `app-unifilar-summary`, `app-sheet-tabs`). As quatro fichas passam a usar uma folha de estilo comum (`sheet-frame.scss`) e a mesma estrutura topo fixo + abas + corpo que rola.

**Tech Stack:** Angular 22 (standalone, signals, zoneless, OnPush), Angular Material 22.2.6, Leaflet 1.9, Vitest via `ng test`, Sass, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md` (leia antes de começar; os números de seção §N abaixo apontam para ele). Contexto: `DESIGN.md`, `.impecable.md`, `PRODUCT.md`, `CLAUDE.md`.

## Global Constraints

- **PROIBIDO usar Git para escrever.** Nunca rode `git add`, `git commit`, `git stash`, `git checkout`, `git branch`, `git reset` nem crie worktree. Só `git status` e `git diff` são permitidos. O plano anterior mandava fazer commit e isso violou a regra do dono. Onde este plano diz **Registrar**, anote os arquivos e a mensagem sugerida no relatório final; o dono faz os commits.
- TDD: escreva o teste, rode e veja falhar, implemente, rode e veja passar. No fim de cada tarefa, rode a suíte inteira.
- Rodar um arquivo: `npx ng test --watch=false --include caminho/arquivo.spec.ts` (pode repetir `--include`; use `*.spec.ts`, nunca `**`). Suíte: `npx ng test --watch=false`. Build: `npx ng build`.
- Ao ler a saída dos testes, procure também a palavra **"Unhandled"**; erro solto não aparece no resumo e conta como falha.
- Specs de componentes com Material usam `describe('...', { timeout: 20000 }, () => …)`.
- Textos de tela em pt-BR simples. Nenhum código do backend (`START`, `RATIO_1_8`, `ACTIVE`…) aparece na tela.
- Cores de situação (`--gf-status-*`) nunca são cor de texto; só bolinha, traço ou borda ao lado de texto em `--gf-text` (§3.2).
- Os hex de `OPTICAL_COLORS` (ABNT), das funções de cabo (`CABLE_ROLES`) e dos tipos de elemento (`ELEMENT_GROUPS`) **não mudam**.
- Nos estilos: proibido `prefers-color-scheme`; cores só por `var(--gf-*)` ou `var(--mat-sys-*)`; raios `var(--gf-radius-control)` (4px) ou `var(--gf-radius-panel)` (6px), além de `50%` para círculos; `padding`, `gap` e `margin` em múltiplos de 4px.
- Tipos e situações seguem o backend (`src/app/core/api/api-types.ts`). Se faltar algo no backend, pare e avise; não contorne.
- Edição continua passando por `canEdit` (input das fichas).
- No Bash deste ambiente, heredoc com apóstrofo falha: para edições grandes use as ferramentas de edição de arquivo, não `sed`/`echo`.

## Review Focus

1. **Fibra clara num fundo claro e fibra preta num fundo escuro** (branca, amarela, cinza e turquesa no tema claro; preta no escuro): a bolinha precisa ter borda visível e o número precisa ter tinta legível. Teste na Tarefa 4 (`FiberDotComponent`: tinta e borda por cor).
2. **Fibra de um cabo que não chega à caixa** (o `fiberIndex` não tem o id): o diagrama mostra "Fibra de outro cabo" e não quebra. Testes nas Tarefas 5 e 8.
3. **Trocar de elemento com outra aba aberta** (o mesmo componente de ficha é reaproveitado com outro input): a ficha volta para "Resumo". Testes nas Tarefas 8 e 10.
4. **Tema do app diferente do tema do sistema** (escolheu escuro no app com o Windows claro, ou o contrário): as cores seguem a classe `html.dark-theme`, não o sistema. Verificação na Tarefa 1 (nenhum `prefers-color-scheme` nos estilos) e conferência no navegador na Tarefa 14.
5. **Caixa sem bandejas, portas ou splitters**: o selo de ocupação não aparece como "0/0" e a seção mostra o texto de vazio. Testes nas Tarefas 4 e 8.

---

### Task 1: Tokens, tema escuro e fontes

**Files:**
- Create: `src/theme/_tokens.scss`
- Modify: `src/styles.scss` (topo do arquivo; bloco `html` nas linhas 7–31; apagar o bloco "Esquema Unifilar" nas linhas 33–68; regra `body` nas linhas 70–75)
- Modify: `src/index.html:11` (link de fontes)

**Interfaces:**
- Produces: as variáveis CSS `--gf-*` da §3 (nomes exatos abaixo) e a classe global `.gf-data`. Todas as tarefas seguintes usam esses nomes.

Tarefa só de estilo: não há teste unitário. A prova é o build e a inspeção do CSS gerado.

- [ ] **Step 1: Medir a suíte antes de mexer**

Run: `npx ng test --watch=false`
Expected: todos os testes passam (referência do `CLAUDE.md`: 48 arquivos / 241 testes). Anote os números; se algo já falhar antes de você mexer, pare e avise.

- [ ] **Step 2: Criar `src/theme/_tokens.scss` com exatamente este conteúdo**

```scss
// Tokens do GeoFiber (Esquema Unifilar). Spec: docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md §3.
// O tema vem do `color-scheme` do <html> (classe `dark-theme`); por isso `light-dark()`.

@mixin tokens {
  --gf-bg: light-dark(oklch(97.2% 0.003 247.9), oklch(21.8% 0.017 248.6));
  --gf-surface: light-dark(oklch(100% 0 0), oklch(26.9% 0.023 251.3));
  --gf-surface-2: light-dark(oklch(95.7% 0.005 247.9), oklch(31.1% 0.027 248.7));
  --gf-border: light-dark(oklch(88.3% 0.014 233.8), oklch(40.2% 0.034 248.7));
  --gf-text: light-dark(oklch(26.9% 0.023 251.3), oklch(97.2% 0.003 247.9));
  --gf-text-2: light-dark(oklch(52.1% 0.027 246.3), oklch(76% 0.037 247));
  --gf-accent: light-dark(oklch(51.5% 0.106 161.6), oklch(74.6% 0.181 152.3));
  --gf-on-accent: light-dark(oklch(100% 0 0), oklch(26.9% 0.023 251.3));
  --gf-accent-soft: light-dark(oklch(95% 0.03 161.6), oklch(32% 0.05 160));

  --gf-status-normal: light-dark(oklch(61.8% 0.13 160.7), oklch(74.6% 0.181 152.3));
  --gf-status-info: light-dark(oklch(53.4% 0.125 252.4), oklch(67.1% 0.109 247.5));
  --gf-status-alert: light-dark(oklch(69.9% 0.146 67.7), oklch(76.3% 0.163 69.4));
  --gf-status-critical: light-dark(oklch(57.9% 0.187 25.2), oklch(63.1% 0.194 29.4));
  --gf-status-inactive: light-dark(oklch(66.8% 0.024 250.3), oklch(57.3% 0.029 248.3));
  --gf-critical-soft: light-dark(oklch(95% 0.03 25), oklch(32% 0.07 25));
  --gf-on-critical-soft: light-dark(oklch(45% 0.16 25), oklch(88% 0.06 25));

  --gf-fiber-edge: light-dark(oklch(0% 0 0 / 0.35), oklch(100% 0 0 / 0.55));
  --gf-ink-dark: oklch(26.9% 0.023 251.3);
  --gf-ink-light: oklch(100% 0 0);

  --gf-radius-control: 4px;
  --gf-radius-panel: 6px;
  --gf-shadow-float: 0 1px 2px oklch(0% 0 0 / 0.16), 0 2px 8px oklch(0% 0 0 / 0.1);
  --gf-font-ui: 'IBM Plex Sans', system-ui, sans-serif;
  --gf-font-data: 'IBM Plex Mono', ui-monospace, monospace;
  --gf-touch: 44px;
}

// Faz os componentes do Angular Material usarem os tokens acima.
@mixin material-overrides {
  --mat-sys-background: var(--gf-bg);
  --mat-sys-surface: var(--gf-bg);
  --mat-sys-surface-variant: var(--gf-surface-2);
  --mat-sys-surface-container-lowest: var(--gf-surface);
  --mat-sys-surface-container-low: var(--gf-surface);
  --mat-sys-surface-container: var(--gf-surface-2);
  --mat-sys-surface-container-high: var(--gf-surface);
  --mat-sys-surface-container-highest: var(--gf-surface-2);
  --mat-sys-on-background: var(--gf-text);
  --mat-sys-on-surface: var(--gf-text);
  --mat-sys-on-surface-variant: var(--gf-text-2);
  --mat-sys-outline: var(--gf-text-2);
  --mat-sys-outline-variant: var(--gf-border);
  --mat-sys-primary: var(--gf-accent);
  --mat-sys-on-primary: var(--gf-on-accent);
  --mat-sys-primary-container: var(--gf-accent-soft);
  --mat-sys-on-primary-container: var(--gf-text);
  --mat-sys-error: var(--gf-status-critical);
  --mat-sys-error-container: var(--gf-critical-soft);
  --mat-sys-on-error-container: var(--gf-on-critical-soft);

  --mat-sys-corner-extra-small: 4px;
  --mat-sys-corner-small: 4px;
  --mat-sys-corner-medium: 6px;
  --mat-sys-corner-large: 6px;
  --mat-sys-corner-extra-large: 6px;
  --mat-button-filled-container-shape: 4px;
  --mat-button-outlined-container-shape: 4px;
  --mat-button-protected-container-shape: 4px;
  --mat-button-text-container-shape: 4px;
  --mat-button-tonal-container-shape: 4px;
  --mat-dialog-container-shape: 6px;
  --mat-menu-container-shape: 4px;
  --mat-tooltip-container-shape: 4px;
  --mat-snack-bar-container-shape: 4px;
  --mat-form-field-outlined-container-shape: 4px;
  --mat-card-elevated-container-shape: 6px;
  --mat-card-filled-container-shape: 6px;
  --mat-card-outlined-container-shape: 6px;
}
```

- [ ] **Step 3: Ligar os tokens em `src/styles.scss`**

1. Logo abaixo de `@use '@angular/material' as mat;` (linha 1), acrescente `@use './theme/tokens';`.
2. No `@include mat.theme(...)` (linhas 10–19): troque `primary: mat.$azure-palette` por `primary: mat.$green-palette`, `tertiary: mat.$green-palette` por `tertiary: mat.$azure-palette` e `typography: Roboto` por `typography: (plain-family: 'IBM Plex Sans', brand-family: 'IBM Plex Sans')`.
3. Logo depois do `@include mat.theme(...)` (ainda dentro do bloco `html {`), acrescente `@include tokens.tokens;` e `@include tokens.material-overrides;`.
4. Apague o bloco inteiro do comentário `// --- Esquema Unifilar (Visual Redesign)` até o fim do `@media (prefers-color-scheme: dark) { … }` (linhas 33–68).
5. Na regra `body`, use `font: var(--mat-sys-body-medium);`, `background: var(--gf-bg);` e `color: var(--gf-text);`.
6. Logo depois da regra `body`, acrescente:

```scss
// Dados técnicos: coordenadas, dB, números de fibra e porta, ocupação.
.gf-data {
  font-family: var(--gf-font-data);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Trocar a fonte em `src/index.html`**

Substitua a linha 11 (link da Roboto) por:
`<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`
Mantenha os `preconnect` e o link do Material Symbols.

- [ ] **Step 5: Build e conferência do CSS gerado**

Run: `npx ng build`
Expected: build sem erro.

Run: `grep -l "gf-accent" dist/*/browser/styles-*.css && grep -c "IBM Plex Sans" dist/*/browser/styles-*.css && grep -c "unifilar-" dist/*/browser/styles-*.css`
Expected: o primeiro imprime o caminho do CSS; o segundo imprime um número ≥ 1; o terceiro imprime `0`.

Run: `grep -rn "prefers-color-scheme" src --include=*.scss`
Expected: nenhuma linha.

Se o build reclamar do mapa `typography`, use `typography: 'IBM Plex Sans'` e rode de novo.

- [ ] **Step 6: Suíte inteira**

Run: `npx ng test --watch=false`
Expected: mesmo total do Step 1, tudo passando, nenhum "Unhandled".

- [ ] **Step 7: Registrar**

Arquivos: `src/theme/_tokens.scss`, `src/styles.scss`, `src/index.html`. Mensagem sugerida: `feat: tokens do Esquema Unifilar com tema claro/escuro pela classe do app`.

---

### Task 2: Cores de situação e forma da linha nos catálogos

**Files:**
- Modify: `src/app/core/network/network-catalog.ts:109-121` (cores de situação) e `:155-157` (canvas)
- Modify: `src/app/core/network/optical-catalog.ts:10-30` (`ink`) e `:44-56` (cores de situação)
- Modify: `src/app/core/network/line-state-style.ts`
- Test: `src/app/core/network/network-catalog.spec.ts`, `src/app/core/network/optical-catalog.spec.ts`, `src/app/core/network/line-state-style.spec.ts`, `src/app/shared/map/pin-marker.spec.ts:20`

**Interfaces:**
- Produces:
  - `OpticalColorDefinition` ganha `ink: 'dark' | 'light'`.
  - `lineStyleByState(state: LineState): LineStyle` com os padrões da §5.
  - `lineStateOf(status: InfrastructureStatus | CustomerStatus): LineState`
  - `fiberLineState(status: FiberStatus | undefined): LineState`
  - Cores de situação passam a ser as strings `'var(--gf-status-normal)'`, `'var(--gf-status-info)'`, `'var(--gf-status-alert)'`, `'var(--gf-status-critical)'` e `'var(--gf-status-inactive)'`.

- [ ] **Step 1: Escrever os testes que falham**

Em `network-catalog.spec.ts`, acrescente:

```ts
it('colors infrastructure and customer statuses with theme tokens', () => {
  expect(statusDefinition('ACTIVE').color).toBe('var(--gf-status-normal)');
  expect(statusDefinition('INSTALLED').color).toBe('var(--gf-status-info)');
  expect(statusDefinition('PLANNED').color).toBe('var(--gf-status-alert)');
  expect(statusDefinition('DAMAGED').color).toBe('var(--gf-status-critical)');
  expect(statusDefinition('DEACTIVATED').color).toBe('var(--gf-status-inactive)');
  expect(statusDefinition('BLOCKED').color).toBe('var(--gf-status-alert)');
  expect(statusDefinition('CANCELLED').color).toBe('var(--gf-status-inactive)');
});
```

Nas expectativas que já existem nesse arquivo (linhas 6, 18 e 24), troque `'#e53935'` por `'#d23c3c'` e `'#9e9e9e'` por `'#8a96a3'`.

Em `optical-catalog.spec.ts`, acrescente:

```ts
it('colors fiber and port statuses with theme tokens', () => {
  expect(fiberStatusDefinition('AVAILABLE').color).toBe('var(--gf-status-normal)');
  expect(fiberStatusDefinition('OCCUPIED').color).toBe('var(--gf-status-info)');
  expect(fiberStatusDefinition('BROKEN').color).toBe('var(--gf-status-critical)');
  expect(fiberStatusDefinition('RESERVED').color).toBe('var(--gf-status-alert)');
  expect(portStatusDefinition('FREE').color).toBe('var(--gf-status-normal)');
  expect(portStatusDefinition('FAULTY').color).toBe('var(--gf-status-critical)');
});

it('gives each ABNT color a readable ink for the number on top', () => {
  const ink = Object.fromEntries(OPTICAL_COLORS.map((item) => [item.color, item.ink]));
  expect(ink).toEqual({
    GREEN: 'dark', YELLOW: 'dark', WHITE: 'dark', BLUE: 'dark', RED: 'light', VIOLET: 'light',
    BROWN: 'light', PINK: 'dark', BLACK: 'light', GRAY: 'dark', ORANGE: 'dark', TURQUOISE: 'dark',
  });
});
```

Substitua o conteúdo de `line-state-style.spec.ts` por testes que exijam:
- `lineStyleByState`: `active` → `{ dasharray: '', linecap: 'round' }`; `planned` → `'4 4'`; `reserved` → `'8 3'`; `disabled` → `'1 3'`; `broken` → `'6 2 1 2'`. Todos os padrões diferentes entre si (por exemplo, `new Set([...]).size === 5`).
- `lineStateOf`: `ACTIVE`, `INSTALLED` → `'active'`; `PLANNED` → `'planned'`; `BLOCKED` → `'reserved'`; `DEACTIVATED`, `CANCELLED` → `'disabled'`; `DAMAGED` → `'broken'`.
- `fiberLineState`: `BROKEN` → `'broken'`; `RESERVED` → `'reserved'`; `AVAILABLE`, `OCCUPIED` e `undefined` → `'active'`.

Em `pin-marker.spec.ts:20`, troque `'#2e7d32'` por `'var(--gf-status-normal)'`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/network/network-catalog.spec.ts --include src/app/core/network/optical-catalog.spec.ts --include src/app/core/network/line-state-style.spec.ts --include src/app/shared/map/pin-marker.spec.ts`
Expected: FAIL. As cores ainda são hex, `ink` não existe, `lineStateOf` e `fiberLineState` não estão definidos e `reserved`/`disabled`/`broken` têm os padrões antigos.

- [ ] **Step 3: Implementar**

- `network-catalog.ts`: aplique o mapeamento da §3.2 em `INFRA_STATUSES` e `CUSTOMER_STATUSES`; em `cableLineStyle`, use `'#d23c3c'` (DAMAGED) e `'#8a96a3'` (DEACTIVATED). Não toque em `ELEMENT_GROUPS` nem em `CABLE_ROLES`.
- `optical-catalog.ts`: acrescente `ink: 'dark' | 'light'` à interface e a cada uma das 12 cores (tabela da §3.3); aplique os tokens em `FIBER_STATUSES` e `PORT_STATUSES` (AVAILABLE/FREE = normal, OCCUPIED = info, RESERVED = alert, BROKEN/FAULTY = critical).
- `line-state-style.ts`: troque os padrões de `reserved` (`'8 3'`, round), `disabled` (`'1 3'`, butt) e `broken` (`'6 2 1 2'`, butt); acrescente `lineStateOf` e `fiberLineState` usando `switch`. Importe os tipos de `../api/api-types`.

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo comando do Step 2.
Expected: PASS.

- [ ] **Step 5: Suíte inteira**

Run: `npx ng test --watch=false`
Expected: tudo passando, nenhum "Unhandled". Se outro spec comparar com um hex de situação antigo, troque pela string `var(--gf-status-…)` correspondente da tabela da §3.2.

- [ ] **Step 6: Registrar**

Arquivos: os 4 de código e os 4 specs listados. Mensagem sugerida: `feat: situações com tokens do tema e forma de linha por estado`.

---

### Task 3: Mapa escuro acompanha o tema escuro

**Files:**
- Modify: `src/app/core/services/map-preferences.ts`
- Modify: `src/app/features/network-map/network-sidebar/network-sidebar.ts` (método que chama `this.theme.toggle()`, perto da linha 42)
- Modify: `src/app/features/network-models/network-models-page.ts` (método que chama `this.theme.toggle()`, perto da linha 50)
- Create (test): `src/app/core/services/map-preferences.spec.ts`

**Interfaces:**
- Produces:
  - `export function baseLayerForTheme(currentKey: string, mode: ThemeMode): string` em `map-preferences.ts`
  - `MapPreferencesService.followTheme(mode: ThemeMode): void`
- Use `import type { ThemeMode } from './theme';` (só o tipo, para não criar ciclo de import).

- [ ] **Step 1: Escrever os testes que falham** em `map-preferences.spec.ts`

```ts
import { TestBed } from '@angular/core/testing';
import { MapPreferencesService, baseLayerForTheme } from './map-preferences';

describe('baseLayerForTheme', () => {
  it('switches the street and light maps to the dark map in the dark theme', () => {
    expect(baseLayerForTheme('streets', 'dark')).toBe('dark');
    expect(baseLayerForTheme('light', 'dark')).toBe('dark');
  });

  it('switches the dark map back to streets in the light theme', () => {
    expect(baseLayerForTheme('dark', 'light')).toBe('streets');
  });

  it('never changes the satellite map', () => {
    expect(baseLayerForTheme('satellite', 'dark')).toBe('satellite');
    expect(baseLayerForTheme('satellite', 'light')).toBe('satellite');
  });

  it('keeps a map that already matches the theme', () => {
    expect(baseLayerForTheme('dark', 'dark')).toBe('dark');
    expect(baseLayerForTheme('streets', 'light')).toBe('streets');
  });
});

describe('MapPreferencesService.followTheme', () => {
  beforeEach(() => localStorage.clear());

  it('changes the saved base layer to match the theme', () => {
    const service = TestBed.inject(MapPreferencesService);
    service.setBaseLayer('streets');
    service.followTheme('dark');
    expect(service.baseLayerKey()).toBe('dark');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/services/map-preferences.spec.ts`
Expected: FAIL, porque `baseLayerForTheme` e `followTheme` não existem.

- [ ] **Step 3: Implementar** `baseLayerForTheme` e `followTheme(mode)` (este chama `setBaseLayer(baseLayerForTheme(this.baseLayerKey(), mode))`).

- [ ] **Step 4: Ligar nos dois botões de tema**

Em `network-sidebar.ts` e em `network-models-page.ts`, injete `MapPreferencesService` (`private readonly mapPreferences = inject(MapPreferencesService);`) e, logo depois de `this.theme.toggle();`, chame `this.mapPreferences.followTheme(this.theme.mode());`. Não chame `followTheme` na inicialização: a camada salva pelo usuário é respeitada ao abrir o app.

- [ ] **Step 5: Rodar e ver passar; depois a suíte inteira**

Run: `npx ng test --watch=false --include src/app/core/services/map-preferences.spec.ts` → PASS.
Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled".

- [ ] **Step 6: Registrar**

Arquivos: os 3 modificados e o spec novo. Mensagem sugerida: `feat: mapa base acompanha a troca de tema`.

---

### Task 4: Peças comuns — bolinha de fibra, selo de ocupação e contas de ocupação

**Files:**
- Create: `src/app/shared/common/fiber-dot.ts` e `src/app/shared/common/fiber-dot.spec.ts`
- Modify: `src/app/shared/common/occupancy-badge.component.ts` e `occupancy-badge.component.spec.ts`
- Create: `src/app/core/network/occupancy.ts` e `src/app/core/network/occupancy.spec.ts`

**Interfaces:**
- Consumes: `OPTICAL_COLORS` com `ink` (Tarefa 2).
- Produces:
  - `FiberDotComponent`, seletor `app-fiber-dot`, com inputs `color = input<OpticalColor | undefined>()`, `number = input<number | null>(null)`, `kind = input<'fibra' | 'tubo'>('fibra')` e `size = input<'md' | 'sm'>('md')`.
  - `OccupancyBadgeComponent` (mesmo seletor `app-occupancy-badge`) ganha `unit = input('posições')`.
  - `occupancy.ts`: `interface Occupancy { occupied: number; capacity: number }` e as funções
    `servicePortOccupancy(ports: readonly Pick<ServicePortResponse, 'customerId'>[]): Occupancy` (ocupada = tem `customerId`),
    `splitterOccupancy(splitter: Pick<SplitterResponse, 'ports'>): Occupancy` (só portas `OUTPUT`; ocupada = tem `servicePortId` ou `fiberId`),
    `oltPortOccupancy(ports: readonly Pick<OltPortResponse, 'status' | 'fiberId'>[]): Occupancy` (ocupada = tem `fiberId` ou `status === 'OCCUPIED'`) e
    `tubeOccupancy(fibers: readonly { status?: FiberStatus }[]): Occupancy` (ocupada = `status === 'OCCUPIED'`).

- [ ] **Step 1: Escrever os testes que falham**

`occupancy.spec.ts`: um teste por função, com estes números:
- 3 portas, 2 com `customerId` → `{ occupied: 2, capacity: 3 }`.
- Splitter com 1 entrada e 4 saídas, uma com `servicePortId` e outra com `fiberId` → `{ occupied: 2, capacity: 4 }` (a entrada não conta).
- Portas da OLT `[{status:'FREE'},{status:'OCCUPIED'},{status:'FREE', fiberId:'f'}]` → `{ occupied: 2, capacity: 3 }`.
- Fibras `[{status:'OCCUPIED'},{status:'AVAILABLE'},{status:'BROKEN'},{}]` → `{ occupied: 1, capacity: 4 }`.
- Lista vazia → `{ occupied: 0, capacity: 0 }` (pode ficar num teste só, usando as funções de lista).

`fiber-dot.spec.ts` (`{ timeout: 20000 }`, renderize com `setInput`):
- `color: 'BLUE', number: 4` → o `span.fiber-dot` tem `textContent` `'4'`, `aria-label` `'Fibra 4 · Azul'`, `title` igual e `style.background` `'rgb(30, 136, 229)'`.
- `color: 'WHITE'` → tem a classe `fiber-dot--ink-dark`; `color: 'BLACK'` → tem `fiber-dot--ink-light`.
- `kind: 'tubo', color: 'GREEN', number: 1` → `aria-label` `'Tubo 1 · Verde'`.
- `size: 'sm', number: 2` → tem a classe `fiber-dot--sm` e o `textContent` fica vazio (número só no `aria-label`).
- `color: undefined, number: 3` → classe `fiber-dot--unknown`, `aria-label` `'Fibra 3 · cor desconhecida'`.

Em `occupancy-badge.component.spec.ts`, mantenha o que existe e acrescente:
- `occupied 6, capacity 8, unit 'ocupadas'` → texto `'6/8 ocupadas'`.
- `capacity 0` → `textContent.trim()` vazio.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/network/occupancy.spec.ts --include src/app/shared/common/fiber-dot.spec.ts --include src/app/shared/common/occupancy-badge.component.spec.ts`
Expected: FAIL (arquivos e input `unit` inexistentes).

- [ ] **Step 3: Implementar `occupancy.ts`** com as quatro funções acima.

- [ ] **Step 4: Implementar `FiberDotComponent`** (OnPush, standalone, template e estilos inline)

Template:
```html
<span class="fiber-dot"
  [class.fiber-dot--sm]="size() === 'sm'"
  [class.fiber-dot--unknown]="!definition()"
  [class.fiber-dot--ink-dark]="definition()?.ink === 'dark'"
  [class.fiber-dot--ink-light]="definition()?.ink === 'light'"
  [style.background]="definition()?.hex ?? null"
  [attr.aria-label]="label()" [attr.title]="label()" role="img">{{ size() === 'md' ? (number() ?? '') : '' }}</span>
```
- `definition = computed(() => OPTICAL_COLORS.find((item) => item.color === this.color()))`. Não use `opticalColor()`, que devolve Verde quando a cor falta.
- `label = computed(...)`: `'Fibra'`/`'Tubo'` + `' ' + número` (se houver) + `' · '` + nome da cor ou `'cor desconhecida'`.
- Estilos: `.fiber-dot` é `display:inline-grid; place-items:center; flex:none; width:24px; height:24px; box-sizing:border-box; border-radius:50%; border:1px solid var(--gf-fiber-edge); font:600 11px/1 var(--gf-font-data);`. `--sm` tem `14px` × `14px`. `--ink-dark` usa `color: var(--gf-ink-dark)` e `--ink-light` usa `color: var(--gf-ink-light)`. `--unknown` usa `background: transparent; border-style: dashed; border-color: var(--gf-text-2); color: var(--gf-text-2)`.

- [ ] **Step 5: Ajustar `OccupancyBadgeComponent`**

- Acrescente `unit = input('posições')`. Tire `CommonModule`.
- Template: `@if (capacity() > 0) { <span class="occupancy gf-data"><strong>{{ occupied() }}</strong>/{{ capacity() }} {{ unit() }}</span> }`.
- Estilos: `.occupancy { font-size: 12px; color: var(--gf-text-2); white-space: nowrap; } strong { color: var(--gf-text); font-weight: 600; }`. Tire o `#5d6b78` e a `'Courier New'`.

- [ ] **Step 6: Rodar e ver passar; depois a suíte inteira**

Run: o comando do Step 2 → PASS.
Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled".

- [ ] **Step 7: Registrar**

Arquivos: os 6 desta tarefa. Mensagem sugerida: `feat: bolinha de fibra ABNT e ocupação ocupado/total`.

---

### Task 5: Diagrama da emenda (entrada → meio → saída)

**Files:**
- Modify: `src/app/core/network/box-interior.ts` e `box-interior.spec.ts`
- Modify: `src/app/shared/diagram/diagram-line.component.ts`, `.html`, `.scss` e `.spec.ts`
- Delete: `src/app/features/network-map/visual-redesign.integration.spec.ts` (testa a API antiga do componente e só repete os specs dos componentes; os testes reais da ficha vêm na Tarefa 8)

**Interfaces:**
- Consumes: `FiberDotComponent` (Tarefa 4); `LineState`, `lineStyleByState` (Tarefa 2); `FiberInfo` e `fiberLabel` (já existem em `box-interior.ts`).
- Produces, em `box-interior.ts`:
  - `export interface DiagramEnd { cable: string; tubeNumber: number; tubeColor?: OpticalColor; fiberNumber: number; fiberColor?: OpticalColor }`
  - `export interface DiagramMiddle { title: string; detail?: string }`
  - `export function diagramEnd(info: FiberInfo | undefined): DiagramEnd | null` (`fiberNumber` = `numberInTube`)
  - `export function describeDiagramEnd(end: DiagramEnd | null): string`: `null` dá `'Fibra de outro cabo'`; senão, o mesmo formato de `fiberLabel` (`'CABO-01, tubo 1 (Verde), fibra 3 (Branco)'`).
  - `export function spliceMiddle(splice: Pick<SpliceResponse, 'positionNumber' | 'attenuationDb'>): DiagramMiddle`: `{ title: 'Posição N' }`, com `detail: '0,05 dB'` quando há atenuação (`Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })`).
  - `export function connectorMiddle(connection: Pick<ConnectionResponse, 'attenuationDb'>): DiagramMiddle`: `{ title: 'Conector' }`, com `detail` igual ao da fusão.
- Produces, `DiagramLineComponent` (`app-diagram-line`), com inputs: `entrance = input<DiagramEnd | null>(null)`, `middle = input.required<DiagramMiddle>()`, `exit = input<DiagramEnd | null>(null)` e `state = input<LineState>('active')`. Remova a interface `FiberInfo` que hoje está nesse arquivo.

- [ ] **Step 1: Escrever os testes que falham**

`box-interior.spec.ts`:
- `diagramEnd(undefined)` → `null`.
- `diagramEnd(info)` com `cableName 'CABO-01', tubeNumber 1, tubeColor 'GREEN', numberInTube 3, color 'WHITE'` → `{ cable: 'CABO-01', tubeNumber: 1, tubeColor: 'GREEN', fiberNumber: 3, fiberColor: 'WHITE' }`.
- `describeDiagramEnd` desse fim → `'CABO-01, tubo 1 (Verde), fibra 3 (Branco)'`; de `null` → `'Fibra de outro cabo'`.
- `spliceMiddle({ positionNumber: 3, attenuationDb: 0.05 })` → `{ title: 'Posição 3', detail: '0,05 dB' }`; `spliceMiddle({ positionNumber: 2 })` → `{ title: 'Posição 2' }` (sem a chave `detail`, use `toEqual`).
- `connectorMiddle({})` → `{ title: 'Conector' }`.

`diagram-line.component.spec.ts` (substitua o conteúdo; `{ timeout: 20000 }`):
- Com entrada `CABO-01` (fibra 3, Branco), meio `{ title: 'Posição 3', detail: '0,05 dB' }` e saída `CABO-02` (fibra 1, Verde), o texto contém `'CABO-01'`, `'CABO-02'`, `'Posição 3'` e `'0,05 dB'`.
- Com entrada `null`, o texto contém `'Fibra de outro cabo'`.
- O `[role=group]` tem `aria-label` que contém `'Entrada: CABO-01, tubo 1 (Verde), fibra 3 (Branco). Posição 3. Saída: CABO-02'`.
- `state 'planned'` → as duas `line` têm `stroke-dasharray` `'4 4'`; `state 'active'` → as `line` não têm o atributo `stroke-dasharray`.
- Há 4 `app-fiber-dot` quando os dois lados existem (tubo + fibra de cada lado).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/network/box-interior.spec.ts --include src/app/shared/diagram/diagram-line.component.spec.ts`
Expected: FAIL (funções e inputs novos inexistentes).

- [ ] **Step 3: Implementar as funções em `box-interior.ts`.**

- [ ] **Step 4: Reescrever o componente**

`diagram-line.component.ts`: imports `[FiberDotComponent]` (tire `CommonModule`); `lineStyle = computed(() => lineStyleByState(this.state()))`; `description = computed(...)` = `` `Entrada: ${describeDiagramEnd(entrance)}. ${middle.title}${detail ? ' · ' + detail : ''}. Saída: ${describeDiagramEnd(exit)}.` ``.

`diagram-line.component.html` (substitua tudo):
```html
<div class="diagram" role="group" [attr.aria-label]="description()" [attr.data-state]="state()">
  <div class="diagram__end diagram__end--in" aria-hidden="true">
    @if (entrance(); as end) {
      <span class="diagram__cable">{{ end.cable }}</span>
      <span class="diagram__dots">
        <app-fiber-dot kind="tubo" size="sm" [color]="end.tubeColor" [number]="end.tubeNumber" />
        <app-fiber-dot [color]="end.fiberColor" [number]="end.fiberNumber" />
      </span>
    } @else {
      <span class="diagram__unknown">Fibra de outro cabo</span>
    }
  </div>
  <svg class="diagram__wire" viewBox="0 0 32 8" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="4" x2="32" y2="4" [attr.stroke-dasharray]="lineStyle().dasharray || null"
      [attr.stroke-linecap]="lineStyle().linecap" />
  </svg>
  <div class="diagram__middle" aria-hidden="true">
    <strong>{{ middle().title }}</strong>
    @if (middle().detail; as detail) { <small class="gf-data">{{ detail }}</small> }
  </div>
  <svg class="diagram__wire" viewBox="0 0 32 8" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="4" x2="32" y2="4" [attr.stroke-dasharray]="lineStyle().dasharray || null"
      [attr.stroke-linecap]="lineStyle().linecap" />
  </svg>
  <div class="diagram__end diagram__end--out" aria-hidden="true">
    @if (exit(); as end) {
      <span class="diagram__cable">{{ end.cable }}</span>
      <span class="diagram__dots">
        <app-fiber-dot [color]="end.fiberColor" [number]="end.fiberNumber" />
        <app-fiber-dot kind="tubo" size="sm" [color]="end.tubeColor" [number]="end.tubeNumber" />
      </span>
    } @else {
      <span class="diagram__unknown">Fibra de outro cabo</span>
    }
  </div>
</div>
```

`diagram-line.component.scss` (substitua tudo). Valores:
- `.diagram`: `display:grid; grid-template-columns: minmax(0,1fr) 24px auto 24px minmax(0,1fr); align-items:center; gap:4px; min-height:44px; font: 400 12px/1.4 var(--gf-font-ui);`
- `.diagram__end`: `display:flex; flex-direction:column; gap:4px; min-width:0;`. `--in` usa `align-items:flex-end; text-align:right;` e `--out` usa `align-items:flex-start;`.
- `.diagram__cable`: `max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--gf-text-2);`
- `.diagram__dots`: `display:inline-flex; align-items:center; gap:4px;`
- `.diagram__unknown`: `color:var(--gf-text-2); font-style:italic;`
- `.diagram__wire`: `width:24px; height:8px; overflow:visible;`. A `line` usa `stroke:var(--gf-text-2); stroke-width:1.5; vector-effect:non-scaling-stroke;`.
- `.diagram__middle`: `display:flex; flex-direction:column; align-items:center; padding:4px 8px; border:1px solid var(--gf-border); border-radius:var(--gf-radius-control); background:var(--gf-surface-2); white-space:nowrap;`. O `small` usa `color:var(--gf-text-2)`.

- [ ] **Step 5: Apagar `src/app/features/network-map/visual-redesign.integration.spec.ts`.**

- [ ] **Step 6: Rodar e ver passar; depois a suíte inteira**

Run: o comando do Step 2 → PASS.
Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled". O total de arquivos cai 1 por causa do spec apagado.

- [ ] **Step 7: Registrar**

Arquivos: `box-interior.ts`, `box-interior.spec.ts`, os 4 arquivos de `diagram-line` e o spec apagado. Mensagem sugerida: `feat: diagrama unifilar da emenda com fibras ABNT`.

---

### Task 6: Linha única do topo da ficha (chega → elemento → sai)

**Files:**
- Create: `src/app/core/network/unifilar.ts` e `unifilar.spec.ts`
- Create: `src/app/shared/diagram/unifilar-summary.ts` e `unifilar-summary.spec.ts`

**Interfaces:**
- Consumes: `LineState` e `lineStyleByState` (Tarefa 2); `AttachedCableResponse` (api-types).
- Produces, em `unifilar.ts`:
  - `interface UnifilarEnd { label: string; detail?: string }`
  - `interface UnifilarSides { incoming: UnifilarEnd[]; outgoing: UnifilarEnd[] }`
  - `boxSides(cables: readonly AttachedCableResponse[]): UnifilarSides`: `END` → chega; `START` → sai; `PASS_THROUGH` → os dois lados. `label` = `name`; `detail` = `'12 fibras'` quando `fiberCapacity` existe.
  - `cableSides(items: readonly { name: string }[]): UnifilarSides`: primeiro → chega; último → sai (só com 2 ou mais itens); lista vazia → os dois lados vazios. Sem `detail`.
  - `oltSides(cables: readonly AttachedCableResponse[]): UnifilarSides`: chega vazio; sai = todos os cabos (mesmo `label`/`detail` de `boxSides`).
  - `customerSides(boxName: string | undefined, portNumber: number | undefined, cancelled: boolean): UnifilarSides`: cancelado ou sem `boxName` → os dois lados vazios; senão chega `[{ label: boxName, detail: 'porta 3' }]` (sem `detail` quando falta a porta) e sai vazio.
  - `splitVisible(ends: readonly UnifilarEnd[], max = 3): { shown: UnifilarEnd[]; hidden: number }`
- Produces, `UnifilarSummaryComponent` (`app-unifilar-summary`), com inputs: `sides = input.required<UnifilarSides>()`, `code = input.required<string>()`, `color = input.required<string>()`, `state = input<LineState>('active')`, `emptyIncoming = input('Nada chega aqui')` e `emptyOutgoing = input('Nada sai daqui')`.

- [ ] **Step 1: Escrever os testes que falham**

`unifilar.spec.ts`: um teste por função, usando os casos da lista acima. Em `boxSides`, use os cabos `[{name:'A', attachmentRole:'END', fiberCapacity:12}, {name:'B', attachmentRole:'START'}, {name:'C', attachmentRole:'PASS_THROUGH', fiberCapacity:6}]`; o resultado deve ser chega `[{label:'A', detail:'12 fibras'}, {label:'C', detail:'6 fibras'}]` e sai `[{label:'B'}, {label:'C', detail:'6 fibras'}]`. Em `splitVisible`, 5 itens → 3 mostrados e `hidden: 2`; 2 itens → 2 mostrados e `hidden: 0`.

`unifilar-summary.spec.ts` (`{ timeout: 20000 }`):
- 5 cabos chegando (`C1`…`C5`) → o texto contém `C1`, `C2`, `C3` e `+2`, e não contém `C4`; o `aria-label` do `[role=group]` contém `C5`.
- Nenhum lado com itens e `emptyIncoming 'Origem do sinal'` → o texto contém `'Origem do sinal'` e `'Nada sai daqui'`.
- O texto contém os rótulos `'Chega'` e `'Sai'`, e o elemento central mostra o `code`.
- `state 'disabled'` → as `line` têm `stroke-dasharray` `'1 3'`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/core/network/unifilar.spec.ts --include src/app/shared/diagram/unifilar-summary.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `unifilar.ts`.**

- [ ] **Step 4: Implementar `UnifilarSummaryComponent`** (OnPush, template e estilos inline)

Estrutura do template:
```html
<div class="unifilar" role="group" [attr.aria-label]="description()">
  <div class="unifilar__side unifilar__side--in" aria-hidden="true">
    <span class="unifilar__caption">Chega</span>
    @for (end of incoming().shown; track $index) {
      <span class="unifilar__end">{{ end.label }}@if (end.detail) {<small class="gf-data"> · {{ end.detail }}</small>}</span>
    } @empty {
      <span class="unifilar__empty">{{ emptyIncoming() }}</span>
    }
    @if (incoming().hidden > 0) { <span class="unifilar__more gf-data">+{{ incoming().hidden }}</span> }
  </div>
  <!-- svg igual ao do diagram-line (viewBox 0 0 32 8, mesma line com dasharray/linecap) -->
  <span class="unifilar__element" [style.background]="color()">{{ code() }}</span>
  <!-- segundo svg igual -->
  <div class="unifilar__side unifilar__side--out" aria-hidden="true"> … mesmo bloco com "Sai", outgoing() e emptyOutgoing() … </div>
</div>
```
- `incoming = computed(() => splitVisible(this.sides().incoming))`, e `outgoing` igual.
- `description` = `` `Chega: ${lista completa separada por ', ' ou emptyIncoming}. Sai: ${idem}.` ``. Cada item da lista é `label + (detail ? ' · ' + detail : '')`; por exemplo, `'Chega: CABO-01 · 12 fibras. Sai: CABO-02 · 6 fibras.'`.
- Estilos:
  - `.unifilar`: `display:grid; grid-template-columns:minmax(0,1fr) 24px auto 24px minmax(0,1fr); align-items:center; gap:4px; padding:8px 0;`
  - `.unifilar__side`: `display:flex; flex-direction:column; gap:4px; min-width:0; font:400 12px/1.4 var(--gf-font-ui);`. `--in` usa `align-items:flex-end; text-align:right;` e `--out` usa `align-items:flex-start;`.
  - `.unifilar__caption`: `font-size:10px; letter-spacing:0.06em; text-transform:uppercase; color:var(--gf-text-2);`
  - `.unifilar__end`: `max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`
  - `.unifilar__empty`, `.unifilar__more`: `color:var(--gf-text-2);`
  - `.unifilar__element`: `display:inline-grid; place-items:center; min-width:44px; height:28px; padding:0 8px; box-sizing:border-box; border-radius:var(--gf-radius-control); color:#fff; font:700 11px/1 var(--gf-font-ui);`
  - A linha do svg tem o mesmo estilo do `diagram-line`.

- [ ] **Step 5: Rodar e ver passar; depois a suíte inteira**

Run: o comando do Step 2 → PASS. Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled".

- [ ] **Step 6: Registrar**

Arquivos: os 4 desta tarefa. Mensagem sugerida: `feat: linha unifilar do topo da ficha (chega → elemento → sai)`.

---

### Task 7: Abas e moldura comum das fichas

**Files:**
- Create: `src/app/shared/common/sheet-tabs.ts` e `sheet-tabs.spec.ts`
- Create: `src/app/features/network-map/sheet-frame.scss`
- Modify: `src/app/features/network-map/sheet-support.ts`; create `src/app/features/network-map/sheet-support.spec.ts` se não existir
- Modify: `src/app/features/network-map/cable-sheet/cable-sheet.scss` (tirar o que vai para a moldura)

**Interfaces:**
- Produces:
  - `export interface SheetTab { id: string; label: string }` em `sheet-tabs.ts`
  - `SheetTabsComponent` (`app-sheet-tabs`): `tabs = input.required<readonly SheetTab[]>()` e `active = model.required<string>()`. Cada aba é um `button` com `role="tab"`, `data-tab="<id>"` e `aria-selected`. É usada com `[(active)]="tab"`.
  - `export function boxTabs(group: ElementGroup, hasSpliceContent: boolean): SheetTab[]` em `sheet-support.ts`: CTO → `resumo:'Resumo'`, `portas:'Portas'` e, se `hasSpliceContent`, `fusoes:'Fusões'`; CEO/DIO → `resumo:'Resumo'`, `fusoes:'Fusões'`, `splitters:'Splitters'`.
  - `sheet-frame.scss`: classes `sheet`, `sheet__top`, `sheet__body`, `sheet__header`, `sheet__badge`, `sheet__titles`, `sheet__status`, `sheet__dot`, `sheet__lead`, `sheet__section`, `sheet__section-head`, `sheet__empty`, `sheet__hint`, `sheet__error`, `sheet__link`, `sheet__add`, `sheet__actions`, `sheet__count`, `sheet__chip` (bolinha via `--gf-chip-color`), `box__group`, `box__group-head`, `box__row`, `box__row--compact`, `box__row--link` e `box__row-main`.

- [ ] **Step 1: Escrever os testes que falham**

`sheet-tabs.spec.ts` (`{ timeout: 20000 }`): com `tabs` = `[{id:'resumo',label:'Resumo'},{id:'fibras',label:'Fibras'}]` e `active` = `'resumo'`:
- Há 2 `[role=tab]` com os textos `'Resumo'` e `'Fibras'`, dentro de um `[role=tablist]`.
- O `[data-tab=resumo]` tem `aria-selected="true"` e o `[data-tab=fibras]` tem `"false"`.
- Depois de clicar em `[data-tab=fibras]` e chamar `fixture.detectChanges()`, `fixture.componentInstance.active()` vale `'fibras'` e o `aria-selected` muda.

`sheet-support.spec.ts`:
- `boxTabs('CTO', false).map(t => t.label)` → `['Resumo', 'Portas']`; `boxTabs('CTO', true)` → `['Resumo', 'Portas', 'Fusões']`.
- `boxTabs('CEO', false)` e `boxTabs('DIO', true)` → `['Resumo', 'Fusões', 'Splitters']`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/shared/common/sheet-tabs.spec.ts --include src/app/features/network-map/sheet-support.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `boxTabs` e `SheetTabsComponent`**

Estilos inline da `SheetTabsComponent` (§5 e `DESIGN.md` "Abas"):
- `.tabs`: `display:flex; gap:4px; border-bottom:1px solid var(--gf-border);`
- `.tabs__tab`: `position:relative; min-height:var(--gf-touch); padding:0 12px; border:0; background:none; color:var(--gf-text-2); font:500 12px/1 var(--gf-font-ui); cursor:pointer;`
- `.tabs__tab::after`: `content:''; position:absolute; left:8px; right:8px; bottom:-1px; height:2px; background:var(--gf-accent); transform:scaleX(0); transition:transform 160ms ease;`
- `.tabs__tab.is-active`: `color:var(--gf-accent);`. O `::after` dela usa `transform:scaleX(1);`.
- `.tabs__tab:focus-visible`: `outline:2px solid var(--gf-accent); outline-offset:-2px;`
- `@media (prefers-reduced-motion: reduce)`: `.tabs__tab::after { transition: none; }`

- [ ] **Step 4: Criar `sheet-frame.scss`** com este conteúdo

```scss
// Base das quatro fichas. Spec: docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md §5.
:host { display: block; }

.sheet {
  display: flex;
  flex-direction: column;
  width: 400px;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 120px);
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--gf-border);
  border-radius: var(--gf-radius-panel);
  background: var(--gf-surface);
  color: var(--gf-text);
  box-shadow: var(--gf-shadow-float);
  font-family: var(--gf-font-ui);
}

.sheet__top { flex: none; display: flex; flex-direction: column; gap: 4px; padding: 12px 16px 0; }
.sheet__body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 12px; padding: 12px 16px 16px;
}

.sheet__header { display: flex; align-items: center; gap: 8px; }
.sheet__badge {
  display: inline-grid; place-items: center; flex: none; min-width: 36px; height: 28px; padding: 0 8px;
  box-sizing: border-box; border-radius: var(--gf-radius-control); color: #fff; font: 700 11px/1 var(--gf-font-ui);
}
.sheet__titles {
  flex: 1; min-width: 0;
  h2 { margin: 0; font: var(--mat-sys-title-medium); overflow-wrap: anywhere; }
}
.sheet__status { display: flex; align-items: center; gap: 4px; margin: 0; color: var(--gf-text-2); font: var(--mat-sys-body-small); }
.sheet__dot { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.sheet__lead { margin: 0; padding: 8px 12px; border-radius: var(--gf-radius-control); background: var(--gf-surface-2); font: var(--mat-sys-body-medium); }

.sheet__section { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--gf-border); }
.sheet__section:first-child { padding-top: 0; border-top: 0; }
.sheet__section-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: var(--gf-touch);
  h3 { margin: 0; font: var(--mat-sys-title-small); }
}
.sheet__empty, .sheet__hint { margin: 0; color: var(--gf-text-2); font: var(--mat-sys-body-small); }
.sheet__error {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px;
  border-radius: var(--gf-radius-control); background: var(--gf-critical-soft); color: var(--gf-on-critical-soft);
}
.sheet__link {
  min-height: var(--gf-touch); padding: 0; border: 0; background: none; color: var(--gf-accent);
  font: inherit; text-align: left; cursor: pointer;
  &:hover { text-decoration: underline; }
}
.sheet__add {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  mat-form-field { flex: 1 1 180px; }
  .is-active { background: var(--gf-accent-soft); }
}
.sheet__actions { display: flex; justify-content: flex-end; gap: 8px; }
.sheet__count { color: var(--gf-text-2); font: var(--mat-sys-label-medium); }
.sheet__chip {
  flex: none; display: inline-flex; align-items: center; gap: 4px; color: var(--gf-text); font: var(--mat-sys-label-medium);
  &::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-chip-color, var(--gf-status-inactive)); }
}

.box__group { display: flex; flex-direction: column; padding: 4px 12px 8px; border: 1px solid var(--gf-border); border-radius: var(--gf-radius-control); }
.box__group-head { display: flex; align-items: center; gap: 8px; min-height: var(--gf-touch); strong { flex: 1; } }
.box__row {
  display: flex; align-items: center; gap: 8px; width: 100%; min-height: var(--gf-touch); padding: 4px 0;
  box-sizing: border-box; border: 0; border-top: 1px dashed var(--gf-border); background: none;
  color: inherit; font: var(--mat-sys-body-medium); text-align: left;
}
.box__row--compact { min-height: 0; }
.box__row--link {
  cursor: pointer; border-top: 0; border-radius: var(--gf-radius-control); padding: 4px 8px;
  &:hover { background: var(--gf-surface-2); }
  &:focus-visible { outline: 2px solid var(--gf-accent); outline-offset: -2px; }
}
.box__row-main {
  display: flex; flex: 1; flex-direction: column; min-width: 0; overflow-wrap: anywhere;
  small { color: var(--gf-text-2); }
}

@media (max-width: 899.98px) {
  :host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1150; }
  .sheet {
    width: 100%; max-width: none; height: 60dvh; max-height: none;
    border-width: 1px 0 0; border-radius: var(--gf-radius-panel) var(--gf-radius-panel) 0 0;
  }
}
```

- [ ] **Step 5: Enxugar `cable-sheet.scss`**

Apague as regras que agora estão na moldura: `:host`, `.sheet`, `.sheet__header`, `.sheet__badge`, `.sheet__titles`, `.sheet__status`, `.sheet__inline`, `.sheet__dot`, `.sheet__lead`, `.sheet__section`, `.sheet__section-head`, `.sheet__empty`, `.sheet__hint`, `.sheet__error`, `.sheet__link`, `.sheet__add`, `.sheet__actions`, `.sheet__count`, `.sheet__chip` e `.sheet__swatch*`. Ficam só `.sheet__route*`, `.sheet__structure`, `.sheet__tube*`, `.sheet__fibers`, `.sheet__fiber` e `.sheet__fiber-body`. Nelas, aplique a tabela de varredura da Tarefa 12 (raios, cores `#…` → tokens, espaçamento múltiplo de 4) e acrescente `min-height: var(--gf-touch)` em `.sheet__route li` e em `.sheet__tube-head`. Troque o comentário da linha 1 por `// Complementos da ficha do cabo (a base vem de ../sheet-frame.scss).`

As fichas só passam a usar a moldura nas Tarefas 8–11. Até lá, `box-sheet`, `olt-sheet` e `customer-sheet` continuam apontando para `cable-sheet.scss` e ficam sem estilo base por algumas tarefas. É esperado: não rode o app para conferir visual antes da Tarefa 11.

- [ ] **Step 6: Rodar e ver passar; build; suíte inteira**

Run: o comando do Step 2 → PASS. Run: `npx ng build` → sem erro. Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled".

- [ ] **Step 7: Registrar**

Arquivos: `sheet-tabs.ts`, `sheet-tabs.spec.ts`, `sheet-frame.scss`, `sheet-support.ts`, `sheet-support.spec.ts` e `cable-sheet.scss`. Mensagem sugerida: `feat: abas e moldura comum das fichas (painel no computador, gaveta no celular)`.

---

### Task 8: Ficha da caixa no novo layout

**Files:**
- Modify: `src/app/features/network-map/box-sheet/box-sheet.ts`, `box-sheet.html`, `box-sheet.scss`
- Test: `src/app/features/network-map/box-sheet/box-sheet.spec.ts` (reescrever)

Os números de linha de `box-sheet.html` abaixo são os do arquivo **antes** desta tarefa (nenhuma tarefa anterior mexe nele).

**Interfaces:**
- Consumes: `SheetTabsComponent`, `SheetTab` e `boxTabs` (T7); `UnifilarSummaryComponent` e `boxSides` (T6); `DiagramLineComponent`, `diagramEnd`, `spliceMiddle`, `connectorMiddle` e `DiagramEnd` (T5); `OccupancyBadgeComponent`, `servicePortOccupancy` e `splitterOccupancy` (T4); `lineStateOf` (T2).
- Produces (protegidos no componente): `tab = linkedSignal<string>({ source: () => this.box().id, computation: () => 'resumo' })`, `tabs`, `sides`, `lineState`, `portUse`, `end(id)`, `spliceMiddle(splice)`, `connectorMiddle(connection)` e `splitterUse(splitter)`.

- [ ] **Step 1: Reescrever `box-sheet.spec.ts` (testes que falham)**

Transforme `fakeStore()` em `fakeStore(overrides: Record<string, unknown> = {})`, que devolve os valores atuais de `fakeStore` mesclados com `overrides`. Faça `render(group, overrides?)` devolver o `fixture` e crie os helpers:
- `text(fixture)` devolve o `textContent`.
- `clickTab(fixture, id)` clica em `[data-tab="<id>"]` e chama `fixture.detectChanges()`.

Testes (`{ timeout: 20000 }`):
1. **CTO abre no Resumo, sem aba Fusões quando não há bandeja nem conector.** Os `[role=tab]` são `['Resumo', 'Portas']` e `[data-tab=resumo]` tem `aria-selected="true"`. Depois de `clickTab('portas')`, o texto contém `'Saída 1 → livre'`, `'Saída 2 → Porta de atendimento 1 (Maria)'`, `'Recebe sinal do Splitter 1:2 (balanceado), saída 2'`, `'1/2 saídas em uso'` e `'1/1 ocupadas'`.
2. **CEO tem Resumo, Fusões e Splitters, e nenhuma porta de atendimento.** Os `[role=tab]` são `['Resumo', 'Fusões', 'Splitters']`. Depois de `clickTab('splitters')`, o texto não contém `'Portas de atendimento'`.
3. **Caixa vazia não mostra 0/0.** CEO com `splitters: signal([])` e `clickTab('fusoes')`: o texto contém `'Nenhuma bandeja cadastrada.'` e `'Nenhuma ligação por conector.'`, e não contém `'0/0'`.
4. **Uma linha de diagrama por fusão, com fibra desconhecida.** CEO com:
   - `trays: signal([{ id: 't1', trayNumber: 1, capacity: 12, usedPositions: 1 }])`
   - `splices: signal([{ id: 's1', trayNumber: 1, positionNumber: 1, inputFiberId: 'f1', outputFiberId: 'zz', attenuationDb: 0.05 }])`
   - `fiberIndex: signal(indexFibers([{ cableId: 'c1', name: 'CABO-01', fibers: [{ id: 'f1', tubeNumber: 1, tubeColor: 'GREEN', numberInTube: 3, color: 'WHITE' }] }]))`

   Depois de `clickTab('fusoes')`: há 1 `app-diagram-line` e o texto contém `'CABO-01'`, `'Fibra de outro cabo'`, `'Posição 1'`, `'0,05 dB'` e `'1/12 posições'`.
5. **Linha unifilar no topo.** Com `cables: signal([{ cableId: 'c1', name: 'CABO-01', attachmentRole: 'END', fiberCapacity: 12 }, { cableId: 'c2', name: 'CABO-02', attachmentRole: 'START', fiberCapacity: 6 }])`: existe `app-unifilar-summary` cujo `[role=group]` tem `aria-label` que contém `'Chega: CABO-01 · 12 fibras'` e `'Sai: CABO-02 · 6 fibras'`.
6. **Trocar de caixa volta para o Resumo.** CTO: `clickTab('portas')`, depois `fixture.componentRef.setInput('box', { ...a mesma caixa, id: 'b2', key: 'box:b2' })` e `fixture.detectChanges()`. Então `[data-tab=resumo]` tem `aria-selected="true"`.
7. **Situação com bolinha de cor, não texto colorido.** CTO em `clickTab('portas')`: o `.sheet__chip` da porta tem `style.getPropertyValue('--gf-chip-color')` diferente de `''`, e `style.color` vale `''`.
8. **Editar dados virou botão de ícone.** Com `canEdit` true, existe `button[aria-label="Editar dados"]`; com `setInput('canEdit', false)`, ele não existe.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/features/network-map/box-sheet/box-sheet.spec.ts`
Expected: FAIL (não há abas nem `app-unifilar-summary`).

- [ ] **Step 3: Novo esqueleto do `box-sheet.html`**

Troque as linhas 1–33 (cabeçalho, situação, carregando, erro e o `} @else if (store.overview()) {`) e as linhas 293–294 (o `}` que fecha esse bloco e o `</aside>`) por esta estrutura. O conteúdo das abas vem no Step 4.

```html
<aside class="sheet" aria-label="Ficha da caixa">
  <div class="sheet__top">
    <header class="sheet__header">
      <span class="sheet__badge" [style.background]="group().color">{{ group().code }}</span>
      <div class="sheet__titles">
        <h2>{{ box().name }}</h2>
        <p class="sheet__status">
          <span class="sheet__dot" [style.background]="status().color"></span>
          {{ group().label }} · {{ status().label }}
        </p>
      </div>
      @if (canEdit()) {
        <button mat-icon-button type="button" matTooltip="Editar dados" aria-label="Editar dados" (click)="editData.emit()">
          <mat-icon>edit</mat-icon>
        </button>
      }
      <button mat-icon-button type="button" matTooltip="Fechar ficha" aria-label="Fechar ficha" (click)="closed.emit()">
        <mat-icon>close</mat-icon>
      </button>
    </header>
    <app-unifilar-summary [sides]="sides()" [code]="group().code" [color]="group().color" [state]="lineState()" />
    <app-sheet-tabs [tabs]="tabs()" [(active)]="tab" />
  </div>

  @if (store.state() === 'loading') {
    <mat-progress-bar mode="indeterminate" />
  }

  <div class="sheet__body" role="tabpanel">
    @if (store.state() === 'error') {
      <div class="sheet__error" role="alert">
        <span>Não foi possível carregar a ficha da caixa.</span>
        <button mat-stroked-button type="button" (click)="store.reload()">Tentar novamente</button>
      </div>
    } @else if (store.overview()) {
      @switch (tab()) {
        @case ('resumo') { … }
        @case ('fusoes') { … }
        @case ('splitters') { … }
        @case ('portas') { … }
      }
    }
  </div>
</aside>
```

- [ ] **Step 4: Distribuir o conteúdo atual pelas abas**

- `resumo`: linha 34 (`sheet__lead`) e linhas 36–52 (seção "Cabos nesta caixa"), sem mudanças.
- `fusoes`: linhas 54–121 sem o `@if (!isCto() || …)` externo (linhas 55 e 121), e depois linhas 123–148 sem o `@if` externo (linhas 124 e 148). Mudanças dentro delas:
  - Troque as linhas 80–95 (cada fusão) por:
    ```html
    <div class="box__splice">
      <app-diagram-line [entrance]="end(splice.inputFiberId)" [middle]="spliceMiddle(splice)"
        [exit]="end(splice.outputFiberId)" [state]="lineState()" />
      @if (canEdit()) {
        <button mat-icon-button type="button" matTooltip="Excluir fusão" aria-label="Excluir fusão" (click)="deleteSplice(splice)">
          <mat-icon>delete_outline</mat-icon>
        </button>
      }
    </div>
    ```
  - Troque as linhas 136–143 (cada conector) pelo mesmo bloco, com `end(connection.fiberAId)`, `connectorMiddle(connection)`, `end(connection.fiberBId)`, `"Excluir conexão"` e `deleteConnector(connection)`.
- `splitters` (CEO/DIO) e `portas` (CTO): linhas 150–233 (splitters). Em `portas`, acrescente em seguida as linhas 235–292 sem o `@if (isCto())` externo (linhas 236 e 292). Os dois `@case` repetem o bloco dos splitters; para não duplicar, ponha o bloco num `<ng-template #splittersBlock>` e use `<ng-container *ngTemplateOutlet="splittersBlock" />` nos dois casos (importe `NgTemplateOutlet`).
  - Em `.box__group-head` de cada splitter (linha 157), depois do `<strong>`, acrescente `<app-occupancy-badge [occupied]="splitterUse(splitter).occupied" [capacity]="splitterUse(splitter).capacity" unit="saídas em uso" />`.
  - No `<h3>` de "Portas de atendimento" (linha 239), depois do `<app-term-hint …/>` e dentro do `.sheet__section-head`, acrescente `<app-occupancy-badge [occupied]="portUse().occupied" [capacity]="portUse().capacity" unit="ocupadas" />`.
  - Na linha 265, troque `[style.color]="portStatus(port).color"` por `[style.--gf-chip-color]="portStatus(port).color"`.
- Apague `.box__arrow` (não é mais usada).

- [ ] **Step 5: Ajustar `box-sheet.ts`**

- `imports`: acrescente `SheetTabsComponent`, `UnifilarSummaryComponent` e `NgTemplateOutlet` (`DiagramLineComponent` e `OccupancyBadgeComponent` já estão lá).
- `styleUrls: ['../sheet-frame.scss', './box-sheet.scss']`.
- Acrescente:
  - `tab = linkedSignal<string>({ source: () => this.box().id, computation: () => 'resumo' })` (importe `linkedSignal` de `@angular/core`)
  - `tabs = computed(() => boxTabs(this.box().group, this.store.trays().length > 0 || this.store.connectors().length > 0))`
  - `sides = computed(() => boxSides(this.store.cables()))`
  - `lineState = computed(() => lineStateOf(this.box().status))`
  - `portUse = computed(() => servicePortOccupancy(this.store.servicePorts()))`
  - `end(id: string | undefined): DiagramEnd | null` → `diagramEnd(id ? this.store.fiberIndex().get(id) : undefined)`
  - `spliceMiddle`, `connectorMiddle` e `splitterUse`, que delegam às funções de mesmo nome.
- O método `connectorText` deixa de ser usado; apague-o. `isCto` continua sendo usado pelos toggles do splitter.

- [ ] **Step 6: `box-sheet.scss`**

Deixe só:
- `.box__toggles`, como está.
- `.box__splice { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px; border-top: 1px dashed var(--gf-border); }`
- `.customer__actions` e `.customer__delete`: troque `var(--mat-sys-error, #b3261e)` por `var(--gf-status-critical)`. Isso é cor de texto, mas nesse botão é exceção: ele já tem ícone e texto.

Apague `.box__group`, `.box__group-head`, `.box__row*` e `.box__arrow`, que agora estão na moldura (Tarefa 7). Troque o comentário da linha 1 por `// Complementos da ficha da caixa (a base vem de ../sheet-frame.scss).`

- [ ] **Step 7: Rodar e ver passar; depois a suíte inteira**

Run: `npx ng test --watch=false --include src/app/features/network-map/box-sheet/box-sheet.spec.ts` → PASS.
Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled".
Run: `npx ng build` → sem erro.

- [ ] **Step 8: Registrar**

Arquivos: `box-sheet.ts`, `box-sheet.html`, `box-sheet.scss` e `box-sheet.spec.ts`. Mensagem sugerida: `feat: ficha da caixa com linha unifilar, abas e diagrama por emenda`.

---

### Task 9: Ficha do cabo no novo layout

**Files:**
- Modify: `src/app/features/network-map/cable-sheet/cable-sheet.ts`, `cable-sheet.html`
- Create (test): `src/app/features/network-map/cable-sheet/cable-sheet.spec.ts`

**Interfaces:**
- Consumes: `SheetTabsComponent`, `UnifilarSummaryComponent`, `cableSides`, `FiberDotComponent`, `OccupancyBadgeComponent`, `tubeOccupancy` e `lineStateOf`.
- Produces: abas `[{id:'resumo',label:'Resumo'},{id:'fibras',label:'Fibras'}]`; `tab = linkedSignal` com `source: () => this.cable().id`.

- [ ] **Step 1: Criar `cable-sheet.spec.ts` (testes que falham)**

Monte com `providers: [{ provide: CableSheetStore, useValue: fake }]`, onde `fake` tem os signals que o template lê:
- `state: signal('ready')`
- `route: signal('Sai da OLT-1 e chega na CTO-2.')`
- `routeItems: signal([{ ref: { kind: 'olt', id: 'o1' }, name: 'OLT-1' }, { ref: { kind: 'box', id: 'b2' }, name: 'CTO-2' }])`
- `editing: signal(false)`, `draft: signal([])`, `picking: signal(false)`, `saving: signal(false)`
- `tubes: signal([{ id: 't1', tubeNumber: 1, capacity: 2, color: 'GREEN', fibers: [{ id: 'f1', numberInTube: 1, absoluteNumber: 1, color: 'GREEN', status: 'OCCUPIED', ends: [] }, { id: 'f2', numberInTube: 2, absoluteNumber: 2, color: 'YELLOW', status: 'AVAILABLE', ends: [] }] }])`
- `fiberCount: signal(2)`, `reload: vi.fn()`

Use o input `cable`: `{ id: 'c1', name: 'CABO-01', role: 'FEEDER', status: 'PLANNED', fiberCapacity: 2, lengthMeters: null, … }`. Complete os outros campos obrigatórios de `MapCable` (veja `core/network/map-element.ts`) com valores neutros.

Testes (`{ timeout: 20000 }`):
1. Abas `['Resumo', 'Fibras']`. No Resumo, o texto contém `'Sai da OLT-1 e chega na CTO-2.'`, e o `aria-label` do unifilar contém `'Chega: OLT-1'` e `'Sai: CTO-2'`.
2. Com o cabo planejado, a linha do unifilar tem `stroke-dasharray` `'4 4'`.
3. `clickTab('fibras')`: o texto contém `'1/2 em uso'` e há pelo menos 1 `app-fiber-dot` dentro de `.sheet__tube-head`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx ng test --watch=false --include src/app/features/network-map/cable-sheet/cable-sheet.spec.ts` → FAIL.

- [ ] **Step 3: Template**

Aplique o mesmo esqueleto do Step 3 da Tarefa 8:
- `aria-label="Ficha do cabo"`; o badge usa `role()`.
- `<p class="sheet__status">` = bolinha da situação + `{{ status().label }} · Cabo de {{ role().label }} · {{ cable().fiberCapacity }} fibras` + `· {{ length }}` quando houver comprimento (dentro de `<span class="gf-data">`).
- `app-unifilar-summary` com `[sides]="sides()"`, `[code]="role().code"`, `[color]="role().color"` e `[state]="lineState()"`.

Abas:
- `resumo`: linha 39 (`sheet__lead`) e linhas 41–116 (seção "Por onde o cabo passa").
- `fibras`: linhas 118–195 (seção "Tubos e fibras"), com estas mudanças:
  - Linha 151: troque o swatch do tubo por `<app-fiber-dot kind="tubo" size="sm" [color]="tube.color" [number]="tube.tubeNumber" />`.
  - Linha 153: troque `<span class="sheet__count">{{ tube.fibers.length }} fibras</span>` por `<app-occupancy-badge [occupied]="tubeUse(tube).occupied" [capacity]="tubeUse(tube).capacity" unit="em uso" />`.
  - Linhas 161–162: troque o swatch da fibra por `<app-fiber-dot [color]="fiber.color" [number]="fiber.numberInTube" />`.
  - Linha 165: envolva `nº {{ fiber.absoluteNumber }}` em `<span class="gf-data">`.
  - Linha 170: troque `[style.color]` por `[style.--gf-chip-color]`.

- [ ] **Step 4: TS**

- `styleUrls: ['../sheet-frame.scss', './cable-sheet.scss']` (tire o `styleUrl`).
- Imports dos componentes novos.
- `tab`, `tabs` (constante com as duas abas), `sides = computed(() => cableSides(this.store.routeItems()))`, `lineState = computed(() => lineStateOf(this.cable().status))` e `tubeUse(tube: TubeView)`, que delega para `tubeOccupancy(tube.fibers)`.

- [ ] **Step 5: Rodar e ver passar; suíte inteira; build** (mesmos critérios da Tarefa 8).

- [ ] **Step 6: Registrar**

Arquivos: `cable-sheet.ts`, `cable-sheet.html` e `cable-sheet.spec.ts`. Mensagem sugerida: `feat: ficha do cabo com linha unifilar, abas e fibras ABNT`.

---

### Task 10: Ficha da OLT no novo layout

**Files:**
- Modify: `src/app/features/network-map/olt-sheet/olt-sheet.ts`, `olt-sheet.html`
- Test: `src/app/features/network-map/olt-sheet/olt-sheet.spec.ts`

**Interfaces:**
- Consumes: os mesmos componentes; `oltSides` e `oltPortOccupancy`.
- Produces: abas `[{id:'resumo',label:'Resumo'},{id:'portas',label:'Portas PON'}]`; `tab = linkedSignal` com `source: () => this.olt().id`.

- [ ] **Step 1: Atualizar `olt-sheet.spec.ts` (testes que falham)**

Faça `render()` devolver o `fixture` e use `clickTab` (copie o helper da Tarefa 8).
- Teste atual dividido: no Resumo, o texto contém `'Esta OLT tem 2 portas PON (1 em uso).'` e `'CABO-01'`. Depois de `clickTab('portas')`, contém `'Placa 1'`, `'PON 1'`, `'Nada ligado'`, `'Envia sinal por CABO-01, tubo 1 (Verde), fibra 1 (Verde)'` e `'1/2 ocupadas'`.
- O unifilar mostra `'Origem do sinal'` e seu `aria-label` contém `'Sai: CABO-01'`.
- Trocar de OLT volta para o Resumo: `clickTab('portas')`, depois `setInput('olt', {...a mesma, id: 'o2', key: 'olt:o2'})` → `[data-tab=resumo]` tem `aria-selected="true"`.

- [ ] **Step 2: Rodar e ver falhar** (`--include` do spec) → FAIL.

- [ ] **Step 3: Template e TS**

- Mesmo esqueleto da Tarefa 8, com `aria-label="Ficha da OLT"`. `sheet__status` = bolinha + `{{ status().label }} · origem do sinal da rede`.
- `app-unifilar-summary` com `[sides]="sides()"`, `[code]="group().code"`, `[color]="group().color"`, `[state]="lineState()"` e `emptyIncoming="Origem do sinal"`.
- `resumo`: linha 34 (lead) e linhas 36–50 (cabos).
- `portas`: linhas 52–117. Na linha 58, acrescente `<app-occupancy-badge [occupied]="slotUse(group).occupied" [capacity]="slotUse(group).capacity" unit="ocupadas" />` depois de `<strong>Placa …</strong>`. Na linha 65, troque `[style.color]` por `[style.--gf-chip-color]`.
- TS: `styleUrls: ['../sheet-frame.scss']`; `tab`, `tabs`, `sides = computed(() => oltSides(this.store.cables()))`, `lineState` e `slotUse(group: SlotGroup)` → `oltPortOccupancy(group.ports)`.

- [ ] **Step 4: Rodar e ver passar; suíte inteira; build.**

- [ ] **Step 5: Registrar**

Arquivos: `olt-sheet.ts`, `olt-sheet.html` e `olt-sheet.spec.ts`. Mensagem sugerida: `feat: ficha da OLT com linha unifilar e abas`.

---

### Task 11: Ficha do cliente no novo layout

**Files:**
- Modify: `src/app/features/network-map/customer-sheet/customer-sheet.ts`, `customer-sheet.html`
- Test: `src/app/features/network-map/customer-sheet/customer-sheet.spec.ts`

**Interfaces:**
- Consumes: `customerSides`, `lineStateOf` e os componentes.
- Produces: abas `[{id:'resumo',label:'Resumo'},{id:'historico',label:'Histórico'}]`; `tab = linkedSignal` com `source: () => this.element().id`; `portNumber = computed<number | undefined>(...)`, que tira de `service()` a busca da porta (linhas 89–90) para os dois usarem.

- [ ] **Step 1: Acrescentar testes que falham em `customer-sheet.spec.ts`**

Use o mesmo cenário do teste atual (CTO-01, porta 3):
- O `aria-label` do unifilar contém `'Chega: CTO-01 · porta 3'`, e o texto contém `'Ponto final'`.
- As abas são `['Resumo', 'Histórico']`, e a seção "Histórico" só aparece depois de `clickTab('historico')`.
- O teste atual (`'Ativo: o cliente recebe o serviço'`, `'Atendido pela CTO-01, porta 3.'`) continua passando no Resumo.

- [ ] **Step 2: Rodar e ver falhar** → FAIL.

- [ ] **Step 3: Template e TS**

- Mesmo esqueleto, com `aria-label="Ficha do cliente"`. O cabeçalho usa `group` (é constante neste componente, sem `()`).
- `sheet__status` = bolinha + `{{ status().label }}` + `· contrato <span class="gf-data">{{ código }}</span>` quando houver código. Ele substitui o `<p>` das linhas 6 e 14–23.
- `app-unifilar-summary` com `[sides]="sides()"`, `[code]="group.code"`, `[color]="group.color"`, `[state]="lineState()"`, `emptyIncoming="Sem CTO"` e `emptyOutgoing="Ponto final"`.
- `resumo`: linhas 25–52 e 73–80, dentro do `@if (customer(); as current)`.
- `historico`: linhas 54–71.
- TS: `styleUrls: ['../sheet-frame.scss', '../box-sheet/box-sheet.scss']`; `sides = computed(() => customerSides(this.boxName(), this.portNumber(), this.customer()?.status === 'CANCELLED'))` e `lineState = computed(() => lineStateOf(this.customer()?.status ?? 'ACTIVE'))`.

- [ ] **Step 4: Rodar e ver passar; suíte inteira; build.**

- [ ] **Step 5: Conferir quem procura "Editar dados" como texto**

Run: `grep -rn "Editar dados" src/app --include=*.spec.ts`
Expected: só testes que procuram por `aria-label`. Se algum procurar o texto do botão, troque para `button[aria-label="Editar dados"]`.

- [ ] **Step 6: Registrar**

Arquivos: `customer-sheet.ts`, `customer-sheet.html` e `customer-sheet.spec.ts`. Mensagem sugerida: `feat: ficha do cliente com linha unifilar e abas`.

---

### Task 12: Mapa e painéis flutuantes no estilo novo

**Files:**
- Create: `src/app/shared/map/map-focus.ts` e `map-focus.spec.ts`
- Modify: `src/app/shared/map/geo-map.ts` (efeitos das linhas 156–194, `syncPaths` perto da linha 727, chamada da linha 317)
- Modify (estilo): `src/styles.scss` (da linha `// --- Marcadores de PIN` até o fim), `src/app/shared/map/map-toolbar.scss`, `map-legend.scss`, `map-layer-panel.scss`, `map-type-picker.scss`, `map-status-bar.scss`, `src/app/features/network-map/network-map-page.scss` e `src/app/features/network-map/network-sidebar/network-sidebar.scss`

**Interfaces:**
- Produces: `export const MAP_FOCUS_CLASS = 'gf-map--focus'` e `export function pathOpacity(selected: boolean, hasFocus: boolean, base = 0.9): number` (selecionado → `1`; outro com foco → `0.35`; sem foco → `base`).

**Tabela de varredura** (vale para os arquivos de estilo desta tarefa e da Tarefa 13):

| Encontrado | Trocar por |
|---|---|
| `border-radius` de 10px a 14px (painel, ficha, cartão, banner) | `var(--gf-radius-panel)` |
| `border-radius` de 6px a 9px, ou `999px` (botão, linha, chip, selo) | `var(--gf-radius-control)` |
| `border-radius: 50%` ou `0` | manter |
| `box-shadow` de painel, banner ou botão flutuante | `var(--gf-shadow-float)`, mais `border: 1px solid var(--gf-border)` se não houver borda |
| `box-shadow` dos pins (`.gf-pin*`, `.gf-vertex__dot`, `.gf-user-location__dot`) | manter |
| `Roboto, Arial, sans-serif` ou `Roboto, system-ui, sans-serif` dentro de `font:` | `var(--gf-font-ui)` |
| cor fixa de texto, fundo ou borda de interface (`#fff`, `#1f2933`, `#52606d`, `rgba(0,0,0,.12)`…) fora de `var(…, fallback)` | o token `--gf-*` equivalente |
| `var(--mat-sys-…, #fallback)` | manter (o `--mat-sys-*` já aponta para os tokens) |
| `padding`, `gap`, `margin` com 2, 3, 5, 6, 10, 14, 18 ou 22px | múltiplo de 4 mais próximo; empate arredonda para cima (2→4, 6→8, 10→12, 14→16, 18→20, 22→24) |

- [x] **Step 1: Escrever o teste que falha** em `map-focus.spec.ts`

`pathOpacity(true, true)` → `1`; `pathOpacity(false, true)` → `0.35`; `pathOpacity(false, false)` → `0.9`; `pathOpacity(false, false, 0.5)` → `0.5`.

- [x] **Step 2: Rodar e ver falhar** (`--include src/app/shared/map/map-focus.spec.ts`) → FAIL.

- [x] **Step 3: Implementar `map-focus.ts` e ligar no `geo-map.ts`**

- Novo efeito no construtor, logo depois do efeito de `selectedElementKey` (linha 161): ele lê `selectedElementKey()` e `selectedPathId()` e, se `this.map` existir, faz `this.map.getContainer().classList.toggle(MAP_FOCUS_CLASS, !!key || !!pathId)`.
- `syncPaths(paths, selectedPathId)` ganha o terceiro parâmetro `hasFocus: boolean`. Em `style.opacity`, use `pathOpacity(selected, hasFocus, path.opacity ?? 0.9)`.
- No efeito das linhas 186–194, leia também `const elementKey = this.selectedElementKey();` e passe `!!selectedPathId || !!elementKey`. Na chamada da linha 317, passe `!!this.selectedPathId() || !!this.selectedElementKey()`.

- [x] **Step 4: Estilos globais do mapa em `src/styles.scss`**

- `.gf-pin__code`: troque `Roboto, system-ui, sans-serif` por `var(--gf-font-ui)`.
- Acrescente:
  ```scss
  .gf-map--focus .gf-pin:not(.is-selected):not(.is-highlighted),
  .gf-map--focus .marker-cluster {
    opacity: 0.45;
    transition: opacity 160ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-map--focus .gf-pin,
    .gf-map--focus .marker-cluster { transition: none; }
  }
  ```
- `.leaflet-tooltip.gf-pin-tooltip`: `padding: 4px 8px; border: 1px solid var(--gf-border); border-radius: var(--gf-radius-control); background: var(--gf-surface); color: var(--gf-text); font: 500 12px/1.4 var(--gf-font-ui); box-shadow: var(--gf-shadow-float);`. No `:before`, use `border-top-color: var(--gf-surface)`.
- `.leaflet-container`: `background: var(--gf-surface-2); font-family: var(--gf-font-ui);`
- `.leaflet-control-attribution, .leaflet-control-scale-line`: `background: var(--gf-surface); color: var(--gf-text-2); border-color: var(--gf-border);`. O link usa `color: var(--gf-accent)`.
- Balão: o wrapper usa `border: 1px solid var(--gf-border); border-radius: var(--gf-radius-panel); background: var(--gf-surface); color: var(--gf-text); box-shadow: var(--gf-shadow-float);`. O `.leaflet-popup-tip` usa `background: var(--gf-surface)`.
- `.gf-popup`, `.gf-popup__title` e `.gf-popup__badge`: troque `Roboto, system-ui, sans-serif` por `var(--gf-font-ui)`. Em `.gf-popup__badge`, use `border-radius: var(--gf-radius-control)`. Ajuste os paddings pela tabela (`10px 12px` → `12px`; `0 6px` → `0 8px`; margens `6px` → `8px`).

- [x] **Step 5: Varredura dos painéis**

Aplique a tabela em `map-toolbar.scss`, `map-legend.scss`, `map-layer-panel.scss`, `map-type-picker.scss`, `network-map-page.scss` (`.project__banner` e `.project__help button`) e `network-sidebar.scss`. Além disso:
- `map-status-bar.scss`: `.status-bar__value` ganha `font-family: var(--gf-font-data);`. `.status-bar` usa `gap: 16px; padding: 4px 16px;` e `.status-bar__item`, `gap: 8px`.
- `map-legend.scss`: no fim, acrescente:
  ```scss
  @media (pointer: coarse) {
    .map-legend__chevron, .map-legend__eye, .map-legend__leaf-action { width: 44px; height: 44px; }
    .map-legend__row, .map-legend__leaf { min-height: 44px; }
  }
  ```
- `map-toolbar.scss`: os botões da barra têm no mínimo `44px` × `44px` (`min-width`/`min-height: var(--gf-touch)`).

- [x] **Step 6: Verificar**

Run: `grep -nE "border-radius: (7|8|9|10|11|12|13|14|999)px" src/styles.scss src/app/shared/map/*.scss src/app/features/network-map/network-map-page.scss src/app/features/network-map/network-sidebar/network-sidebar.scss`
Expected: nenhuma linha.

Run: `grep -nE "Roboto" src/styles.scss src/app/shared/map/*.scss src/app/features/network-map/network-sidebar/network-sidebar.scss`
Expected: nenhuma linha.

Run: `grep -nE "(padding|gap|margin)[^;]*[^0-9](2|3|5|6|10|14|18|22)px" src/app/shared/map/*.scss src/app/features/network-map/network-map-page.scss src/app/features/network-map/network-sidebar/network-sidebar.scss`
Expected: nenhuma linha.

Run: `npx ng test --watch=false --include src/app/shared/map/map-focus.spec.ts` → PASS. Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled". Run: `npx ng build` → sem erro.

- [x] **Step 7: Registrar**

Arquivos: `map-focus.ts`, `map-focus.spec.ts`, `geo-map.ts`, `styles.scss` e os 7 `.scss` da varredura. Mensagem sugerida: `feat: mapa e painéis no Esquema Unifilar, com foco no elemento selecionado`.

---

### Task 13: Formulários, diálogos e página de modelos

**Files (só estilo):**
- `src/app/shared/network/network-form.scss`
- `src/app/shared/ui/confirm-dialog.scss`
- `src/app/features/network-models/model-form-dialog.scss`
- `src/app/features/network-models/network-models-page.scss`
- `src/app/shared/help/view-help-dialog.ts` (estilos inline, linhas 72–81)
- `src/app/shared/help/glossary-dialog.ts` (estilos inline, linha 48)
- `src/app/shared/help/term-hint.ts` (estilos inline)
- os estilos do `fiber-link-dialog` (`src/app/features/network-map/box-sheet/fiber-link-dialog.*`), se houver

Nenhum teste novo; é varredura com a tabela da Tarefa 12. Onde o diálogo lista fibras com cor (`fiber-link-dialog`), troque bolinhas feitas à mão por `<app-fiber-dot>` **só se** já houver uma bolinha de cor no template; não crie bolinha nova.

- [x] **Step 1: Aplicar a tabela da Tarefa 12 nos arquivos listados.**

- [x] **Step 2: Verificar no projeto inteiro**

Run: `grep -rnE "border-radius: (7|8|9|10|11|12|13|14|999)px" src --include=*.scss --include=*.ts`
Expected: nenhuma linha.

Run: `grep -rn "Roboto" src --include=*.scss --include=*.ts --include=*.html`
Expected: nenhuma linha.

Run: `grep -rn "prefers-color-scheme" src --include=*.scss --include=*.ts`
Expected: só `src/app/core/services/theme.ts`, que lê a preferência do sistema na primeira visita, e `src/index.html`. Isso é correto: não é estilo.

Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled". Run: `npx ng build` → sem erro.

- [x] **Step 3: Registrar**

Arquivos: os listados que mudaram. Mensagem sugerida: `style: diálogos e página de modelos no Esquema Unifilar`.

---

### Task 14: Documentação, plano antigo e conferência no navegador

**Files:**
- Modify: `docs/SPECS.md` (§1.1, §2.2–2.7 e §3, acrescentando RI-26…RI-31)
- Modify: `docs/GUIA.md` ("Como usar o mapa", "Ficha do cabo", "Dentro da caixa", "Portas PON da OLT", "Clientes" e "Cores e linhas dos cabos")
- Modify: `README.md` ("Estrutura": `src/theme/`, `shared/common/`, `shared/diagram/`)
- Modify: `DESIGN.md` ("Próximos passos" e paleta)
- Modify: `CLAUDE.md` ("Situação", tabela "Onde está cada coisa" e "Decisões tomadas sem o dono")
- Modify: `docs/superpowers/plans/2026-11-20-visual-redesign-unifilar.md` (aviso no topo)

- [x] **Step 1: SPECS.md**

Acrescente em §3, depois de RI-25, uma frase por regra:
- **RI-26 Tokens:** cores, raios, sombra e fontes só por `--gf-*` (`src/theme/_tokens.scss`); tema pela classe `html.dark-theme` via `light-dark()`; nada de `prefers-color-scheme` em estilo.
- **RI-27 Situação:** a cor de situação nunca é cor de texto; aparece como bolinha, traço ou borda ao lado do texto.
- **RI-28 Fibras:** bolinha ABNT sempre com borda, número com tinta legível e nome acessível (`app-fiber-dot`).
- **RI-29 Ficha:** topo fixo com a linha "chega → elemento → sai" e abas; corpo rola; volta ao Resumo ao trocar de elemento; painel de 400px no computador e gaveta de 60dvh no celular (< 900px).
- **RI-30 Ocupação:** sempre `ocupado/total unidade` (`app-occupancy-badge`); some quando o total é 0.
- **RI-31 Foco no mapa:** com seleção, os outros marcadores ficam a 45% e os outros cabos a 35%; ao trocar o tema, a camada base acompanha (satélite nunca muda).

Em §2, acrescente uma linha por arquivo novo nas tabelas dos módulos: `occupancy.ts`, `unifilar.ts`, `line-state-style.ts`, `fiber-dot`, `sheet-tabs`, `unifilar-summary`, `diagram-line`, `sheet-frame.scss`, `map-focus.ts` e `theme/_tokens.scss`.

- [x] **Step 2: GUIA.md**

Em linguagem simples:
- Como ler a linha do topo da ficha ("à esquerda o que chega, à direita o que sai").
- O que significam as formas da linha: cheia = funcionando; tracejada = planejado; traço longo = reservado ou bloqueado; pontilhada = desativado; traço e ponto = danificado.
- As abas de cada ficha.
- O "3/12".
- Que o mapa escurece o resto quando algo está selecionado.
- Que trocar o tema troca o mapa de ruas pelo escuro.

- [x] **Step 3: README, DESIGN.md e CLAUDE.md**

- README: novas pastas em "Estrutura".
- DESIGN.md: em "Próximos passos", marque 2–7 como feitos e aponte para este plano. Em "Paleta", acrescente uma linha dizendo que os valores oficiais em OKLCH estão em `docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md` §3.
- CLAUDE.md:
  - Troque o parágrafo "Visual redesign (Esquema Unifilar)" pelo status real, com o número de testes medido no Step 4.
  - Acrescente `src/theme/` e `shared/common`/`shared/diagram` na tabela.
  - Em "Decisões tomadas sem o dono", acrescente as 8 decisões da §9 do spec (uma linha cada).
  - Em "Pendências", acrescente "Validar no navegador o redesign Unifilar" até o dono conferir.

No topo do plano antigo, acrescente:
`> **Substituído** por docs/superpowers/plans/2026-11-20-redesign-unifilar-app.md (este foi executado só em parte).`

- [x] **Step 4: Verificação final**

Run: `npx ng test --watch=false` → tudo passando, nenhum "Unhandled". Anote os números de arquivos e testes.
Run: `npx ng build` → sem erro.
Run: `git status`. É só leitura: confira que a lista bate com os arquivos registrados nas tarefas e que nada fora deste plano mudou.

- [ ] **Step 5: Conferência no navegador (fazer com o dono, ou deixar a lista para ele)**

Rode `npm start` (backend em `localhost:8080`) e confira:
1. Tema claro e escuro pelo botão do app, com o Windows no tema oposto: fichas, legenda, barra de status e diálogos trocam juntos.
2. Ao trocar para escuro com o mapa de ruas, o mapa vira o escuro; satélite não muda.
3. Selecionar uma CTO: resto do mapa esmaece; a ficha abre no Resumo com a linha "chega → CTO → sai"; as abas Portas/Fusões funcionam e só o corpo rola.
4. Fusões: um diagrama por emenda, fibras branca e amarela com borda visível, número legível; fibra preta visível no tema escuro.
5. Janela com menos de 900px (ou celular): a ficha vira gaveta embaixo com 60% da altura; nomes longos de cabo terminam em "…" sem rolagem horizontal.
6. Fichas do cabo, da OLT e do cliente: linha do topo, abas e ocupação ("1/2 em uso", "6/8 ocupadas").

Anote o que não bater na seção "Pendências" do `CLAUDE.md`.

- [x] **Step 6: Relatório final para o dono**

Liste por tarefa os arquivos alterados, criados e apagados, com a mensagem de commit sugerida de cada tarefa (as dos passos "Registrar"). Lembre que nada foi commitado.
