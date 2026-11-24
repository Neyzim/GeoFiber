# Ajustes finais antes do teste com técnico — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar as pendências A1–A4 e B1–B2 e escrever o roteiro do teste com o técnico.

**Architecture:** as regras de clique e de vértice viram funções puras testáveis (a página do mapa
não tem spec porque o Leaflet não roda no jsdom); o diálogo de fibras e o store da OLT ganham o
comportamento direto, com testes nos specs que já existem.

**Tech Stack:** Angular 22 (signals, zoneless), Vitest via `ng test`.

**Spec:** `docs/superpowers/specs/2026-11-22-ajustes-finais-teste-design.md`

## Global Constraints

- Sem Git: no fim, listar os arquivos e sugerir a mensagem de commit (o dono commita).
- Textos de tela em pt-BR simples; nenhum código do backend na tela.
- TDD: teste falhando → implementar → passar; suíte inteira e `npx ng build` no fim; procurar "Unhandled".

## Review Focus

- Zoom desconhecido (`view()` ainda `null`): a tolerância de vértice cai para comparação exata (teste na Task 2).
- Diálogo com a fibra já ligada (`slot.current`): trocar a ponta não apaga essa fibra (teste na Task 3).
- Lote com falha no meio: o progresso some (volta a `null`) também no erro (teste na Task 4).
- "Escolher no mapa" com a ferramenta `select`: o segundo clique no mesmo cabo também não abre a edição (teste na Task 1).
- Ficha de outra caixa aberta ao salvar a edição: não recarrega (Task 1, conferido no código).

---

### Task 1: Clique no cabo (A1, B2) e recarga da ficha da caixa (A2)

**Files:**
- Create: `src/app/features/network-map/path-click.ts`, `src/app/features/network-map/path-click.spec.ts`
- Modify: `src/app/features/network-map/network-map-page.ts` (`onPathClick`, `openBoxForm`)

**Interfaces:**
- Produces: `type PathClickAction = 'ignore' | 'warnPicking' | 'edit' | 'select' | 'focus'` e
  `pathClickAction(tool: MapTool, picking: boolean, selectedCableId: string | null, cableId: string): PathClickAction`.

- [x] **Step 1: testes** em `path-click.spec.ts`:
  - `picking=true` → `'warnPicking'` com `select` e com `editCable`, mesmo se o cabo já estiver selecionado;
  - `select` + mesmo cabo → `'edit'`; `select` + outro → `'focus'`;
  - `editCable` + mesmo cabo → `'ignore'` (B2); `editCable` + outro → `'select'`;
  - `addCable`, `addElement`, `move` → `'ignore'`.
- [x] **Step 2:** rodar `npx ng test --watch=false --include src/app/features/network-map/path-click.spec.ts` → FALHA (módulo não existe).
- [x] **Step 3:** implementar `pathClickAction`; em `onPathClick`, usar a ação; `'warnPicking'` chama
  `this.notifications.info('Salve ou cancele a lista antes de abrir outro cabo.')`.
- [x] **Step 4:** em `openBoxForm`, no `onSaved` do modo `edit`, se `this.boxSheet.boxId() === data.box.id`,
  chamar `this.boxSheet.reload()` (A2).
- [x] **Step 5:** rodar o spec → PASSA.

### Task 2: Vértice quase repetido (A4)

**Files:**
- Modify: `src/app/core/network/cable-route.ts`, `src/app/core/network/cable-route.spec.ts`, `network-map-page.ts` (`appendPoint`)

**Interfaces:**
- Produces: `isSameVertex(a: GeoPoint, b: GeoPoint, zoom: number | null, tolerancePx = 6): boolean`.
  Distância em metros (equirretangular basta) comparada a `tolerancePx * 156543.03392 * cos(lat) / 2^zoom`.

- [x] **Step 1: testes**: pontos idênticos → `true` com zoom `null`; a ~1 m no zoom 18 → `true`; a ~1 m
  no zoom `null` → `false`; a ~30 m no zoom 18 → `false`; a ~30 m no zoom 12 → `true`.
- [x] **Step 2:** rodar o spec → FALHA.
- [x] **Step 3:** implementar; em `appendPoint`, trocar a comparação exata por
  `isSameVertex(last, position, this.view()?.zoom ?? null)`.
- [x] **Step 4:** rodar o spec → PASSA.

### Task 3: Trocar a ponta limpa a fibra (A3)

**Files:**
- Modify: `src/app/features/network-map/box-sheet/fiber-link-dialog.ts`, `fiber-link-dialog.spec.ts`

- [x] **Step 1: testes**: com a fibra `f1` livre só na ponta A escolhida, mudar `fiberEnd` para `B` →
  `fiberId` vira `''`; com `slot.current = 'f1'`, mudar a ponta mantém `'f1'`; fibra livre nas duas
  pontas continua escolhida.
- [x] **Step 2:** rodar o spec → FALHA.
- [x] **Step 3:** no construtor, para cada linha, `fiberEnd.valueChanges` (com `takeUntilDestroyed`):
  se `optionsFor(index)` não tem o `fiberId` atual, `fiberId.setValue('')`.
- [x] **Step 4:** rodar o spec → PASSA.

### Task 4: Progresso do lote de portas PON (B1)

**Files:**
- Modify: `olt-sheet-store.ts`, `olt-sheet-store.spec.ts`, `olt-sheet.html` (perto da linha 146)

**Interfaces:**
- Produces: `OltSheetStore.batchProgress: Signal<{ done: number; total: number } | null>`.

- [x] **Step 1: testes**: com `createPort` devolvendo `Subject`s, depois de `addPorts(1, 3)` o progresso é
  `{ done: 0, total: 3 }`; após a 1ª resposta, `{ done: 1, total: 3 }`; ao terminar, `null`; com erro, `null`.
- [x] **Step 2:** rodar o spec → FALHA.
- [x] **Step 3:** implementar com `tap` depois do `concatMap`; no template, enquanto houver progresso,
  mostrar `Criando porta {{ done + 1 }} de {{ total }}…` (`role="status"`).
- [x] **Step 4:** rodar o spec → PASSA.

### Task 5: Roteiro, docs e verificação

**Files:**
- Create: `docs/ROTEIRO-TESTE-USABILIDADE.md` (conteúdo da seção "Roteiro" do design)
- Modify: `docs/SPECS.md` (RI-41 com os seis ajustes), `docs/GUIA.md` (aviso do A1, progresso do B1),
  `README.md` (link do roteiro), `CLAUDE.md` (situação: as etapas conferidas e aprovadas no navegador;
  pendências A/B fechadas; C mantidas; contagem de testes)

- [x] **Step 1:** escrever o roteiro e as docs.
- [x] **Step 2:** `npx ng test --watch=false` → tudo passa, sem "Unhandled"; `npx ng build` → ok.
- [x] **Step 3: Registrar:** listar os arquivos e sugerir:
  `fix: final adjustments before usability test (pick guard, box sheet reload, fiber end reset, vertex tolerance, PON batch progress) and test script`.
