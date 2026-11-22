# Diagrama de fusões (etapa 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a tela por bandeja de `/caixas/:boxId/fusoes` por uma lista de fibras por cabo com o destino de cada uma, uma gaveta com o desenho da ligação e emenda por dois toques que escolhe (ou cria) a bandeja sozinha.

**Architecture:** Uma regra pura (`core/network/fiber-destinations.ts`) transforma o overview da caixa e o `FiberIndex` em cabos → tubos → fibras com destino, e em splitters com saídas. Outra regra pura (`core/network/splice-plan.ts`) escolhe a bandeja e as pontas da emenda nova. O `BoxSheetStore` ganha uma escrita que cria a bandeja (se preciso) e a fusão. Dois componentes novos (`fiber-list`, `fiber-drawer`) e a página reescrita sobre eles; `tray-board` e `cable-strip` saem.

**Tech Stack:** Angular 22 (standalone, signals, OnPush, zoneless), Angular Material, Vitest via `ng test`, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-11-20-diagrama-de-fusoes-design.md`

**Situação:** executado em 2026-11-21 (Tasks 1–6, sem commits — o dono commita).

## Global Constraints

- Sem Git: nada de `add`/`commit`/`branch`/`checkout`/`stash`/worktree. Os passos "Registrar" só anotam a mensagem sugerida no diário; o dono commita.
- TDD: teste escrito e visto falhar antes do código; suíte inteira (`npx ng test --watch=false`) e `npx ng build` no fim. Procurar "Unhandled" na saída.
- Textos de tela em pt-BR simples; nenhum código do backend (`END`, `FUSION`, `RATIO_1_16`, `A`/`B`) aparece na tela.
- Sem backend novo. Fusão: `POST /boxes/{id}/splices` com `trayNumber` obrigatório e **sem** `positionNumber` (o backend escolhe a próxima livre); pontas sempre explícitas.
- Bandeja criada automaticamente: capacidade **12**, número = `nextNumber` das existentes, só se `≤ trayCapacity` da caixa (quando definido).
- Edição só com `canEdit()`; sem ele, nada de "Emendar", "Desfazer emenda" nem "Excluir bandeja".
- Escrita pessimista: a tela muda depois do sucesso (recarrega). Enquanto salva, botões de escrita desabilitados.
- Alvos de toque ≥ 40px no celular; tema pelos tokens `--gf-*` (nunca `prefers-color-scheme` em estilo).
- Specs de componentes com Material: `describe(..., { timeout: 20000 }, ...)`. Mocks de `NotificationService.apiError` retornam `parseApiError(error)`.
- Um arquivo: `npx ng test --watch=false --include <caminho>`.

## Review Focus

1. **Recarregar com gaveta aberta:** depois de emendar ou desfazer, a gaveta deve reabrir pelo **id** (fibra ou emenda) a partir dos dados novos, não segurar o objeto antigo. Teste na Task 5 ("após emendar, a gaveta mostra a emenda nova").
2. **Toque duplo em "Emendar":** a segunda chamada é ignorada enquanto `saving()`. Teste na Task 3 ("ignora um segundo pedido enquanto salva").
3. **Caixa no limite de bandejas:** `trayCapacity` definido e todas cheias → nenhuma chamada, frase na gaveta. Teste na Task 2 e Task 3.
4. **Fibra ligada a item que não está no overview** (link de outra caixa, ou fusão desta caixa ausente na lista): vira "em outra caixa", nunca erro. Teste na Task 1.
5. **Cabo sem fibras no índice:** a aba mostra a frase e "Abrir ficha do cabo", sem quebrar as outras abas. Teste na Task 1 (`empty: true`) e Task 4.

---

### Task 1: Regra de destinos das fibras

**Files:**
- Create: `src/app/core/network/fiber-destinations.ts`
- Test: `src/app/core/network/fiber-destinations.spec.ts`

**Interfaces:**
- Consumes: `FiberInfo`, `FiberIndex`, `outputNumber`, `SPLITTER_RATIOS` (`core/network/box-interior.ts`); `usedEnd`, `attachmentText` (`core/network/splice-board.ts`); `opticalColor` (`core/network/optical-catalog.ts`); `BoxOverviewResponse`, `AttachmentRole`, `FiberEnd` (`core/api/api-types.ts`).
- Produces:
  ```ts
  export type DestinationKind =
    | 'splice' | 'splitter-in' | 'splitter-out' | 'connector' | 'service-port'
    | 'pass-through' | 'free' | 'broken' | 'reserved' | 'elsewhere';
  export interface FiberDestination {
    kind: DestinationKind;
    text: string;                 // texto curto da linha
    spliceId?: string;
    splitterId?: string;
    connectionId?: string;
    servicePortId?: string;
    otherFiberId?: string;        // a outra fibra da fusão/conector
  }
  export interface FiberRow { fiber: FiberInfo; end: FiberEnd; destination: FiberDestination; }
  export interface TubeView { number: number; color?: OpticalColor; used: number; total: number; rows: FiberRow[]; }
  export interface CableView {
    cableId: string; name: string; role: AttachmentRole | undefined;
    roleText: string;             // "chega aqui" | "sai daqui" | "passa por aqui" | ''
    tubes: TubeView[]; empty: boolean;
  }
  export interface SplitterOutput { number: number; used: boolean; text: string; customer?: string; }
  export interface SplitterView { id: string; label: string; inputText: string; outputs: SplitterOutput[]; }
  export function splitterShort(splitter: Pick<SplitterResponse, 'ratio'>): string; // "Splitter 1:16"
  export function boxFiberMap(overview: BoxOverviewResponse, index: FiberIndex): CableView[];
  export function boxSplitters(overview: BoxOverviewResponse, index: FiberIndex): SplitterView[];
  ```
  "Usada" (`used`) = destino diferente de `free`, `pass-through`, `broken`, `reserved`.

- [ ] **Step 1: Escrever os testes**

Monte o overview com um cabo que chega (`c1`, END, 2 fibras no tubo 1 Verde), um que passa (`c2`, PASS_THROUGH, 2 fibras), uma fusão `s1` (c1 f1 B → c2 f1 A, bandeja 1 posição 3), um splitter `sp1` 1:16 com entrada ligada a `c1 f2` (ponta B) e saída porta 2 ligada à porta de atendimento `p1` (número 1) com o cliente "Maria", e um conector ausente. Fibras com `ends` coerentes (link `{ type, id, elementId: 'box1' }`).

```ts
it('ordena cabos que chegam, passam e saem, com tubos e fibras em ordem', () => {
  const map = boxFiberMap(overview, index);
  expect(map.map((c) => [c.name, c.roleText])).toEqual([['CABO-01', 'chega aqui'], ['BACKBONE', 'passa por aqui']]);
  expect(map[0].tubes[0].rows.map((r) => r.fiber.numberInTube)).toEqual([1, 2]);
});
it('fusão desta caixa aponta a outra fibra pelo cabo, cor do tubo e número', () => {
  const row = boxFiberMap(overview, index)[0].tubes[0].rows[0];
  expect(row.destination).toMatchObject({ kind: 'splice', spliceId: 's1', otherFiberId: 'c2f1', text: '→ BACKBONE · Verde 1' });
});
it('entrada do splitter e porta de atendimento com cliente', () => {
  const row = boxFiberMap(overview, index)[0].tubes[0].rows[1];
  expect(row.destination).toMatchObject({ kind: 'splitter-in', splitterId: 'sp1', text: '→ Splitter 1:16' });
  const out = boxSplitters(overview, index)[0].outputs;
  expect(out[0]).toEqual({ number: 1, used: true, text: 'porta 1', customer: 'Maria' });
  expect(out[1]).toEqual({ number: 2, used: false, text: 'livre' });
});
it('cabo que passa sem ligação aqui fica "passa direto"; os outros, "livre"', () => {
  const c2f2 = boxFiberMap(overview, index)[1].tubes[0].rows[1];
  expect(c2f2.destination).toEqual({ kind: 'pass-through', text: 'passa direto' });
});
it('rompida, reservada e ligação fora desta caixa', () => {
  // fibra BROKEN → { kind: 'broken', text: 'rompida' }; RESERVED → 'reservada';
  // link FUSION com id fora de overview.splices → { kind: 'elsewhere', text: 'em outra caixa' };
  // link OLT_PORT → { kind: 'elsewhere', text: 'ligada à OLT' }
});
it('conta as fibras usadas por tubo', () => {
  expect(boxFiberMap(overview, index)[0].tubes[0]).toMatchObject({ used: 2, total: 2 });
});
it('cabo sem fibras no índice vem vazio', () => {
  // overview com cabo c3 sem fibras no index → { cableId: 'c3', empty: true, tubes: [] }
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx ng test --watch=false --include src/app/core/network/fiber-destinations.spec.ts` → erro "Could not resolve ./fiber-destinations".

- [ ] **Step 3: Implementar `fiber-destinations.ts`**

Ordem dos cabos: END, PASS_THROUGH, sem papel, START (estável dentro do grupo). Ponta da linha: END → `usedEnd(role,'in')`; START → `usedEnd(role,'out')`; PASS_THROUGH/sem papel → a ponta que tem ligação nesta caixa, senão `'B'`. "Ligação nesta caixa" = o `link.id` existe na coleção do overview do tipo dela (`splices`, portas de `splitters`, `connections` com `type: 'CONNECTOR'`, `servicePorts`). Prioridade: status `BROKEN`/`RESERVED` primeiro. Saída de splitter na linha: `'← Splitter 1:16 · saída N'` (`outputNumber`). Conector: `'→ conector'`. Porta: `'→ porta N'` + `' · Nome'` com cliente. Splitter na aba: `label` = `splitterShort`, `inputText` = texto curto da fibra de entrada (`'CABO-01 · Verde 2'`) ou `'sem entrada'`; saídas 1..N ordenadas, usada quando tem `fiberId` ou `servicePortId` ocupado; `text` = `'porta N'` (porta de atendimento) ou `'CABO · Cor n'` (fibra) ou `'livre'`.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → todos passam.
- [ ] **Step 5: Registrar** — diário: `feat: map each fiber of a box to its destination`.

---

### Task 2: Plano da emenda nova (bandeja e pontas)

**Files:**
- Create: `src/app/core/network/splice-plan.ts`
- Test: `src/app/core/network/splice-plan.spec.ts`

**Interfaces:**
- Consumes: `FiberRow` (Task 1), `usedEnd`, `nextNumber`, `TrayResponse`, `SpliceResponse`, `SpliceRequest`, `AttachmentRole`.
- Produces:
  ```ts
  export const NEW_TRAY_CAPACITY = 12;
  export type TrayChoice =
    | { kind: 'existing'; trayNumber: number }
    | { kind: 'create'; trayNumber: number; capacity: number }
    | { kind: 'full' };
  export function trayForNewSplice(
    trays: readonly TrayResponse[], splices: readonly SpliceResponse[], boxTrayCapacity: number | null | undefined,
  ): TrayChoice;
  export type SpliceSides = Pick<SpliceRequest, 'inputFiberId' | 'inputFiberEnd' | 'outputFiberId' | 'outputFiberEnd'>;
  export function spliceSides(
    first: { fiberId: string; role: AttachmentRole | undefined },
    second: { fiberId: string; role: AttachmentRole | undefined },
  ): SpliceSides;
  export function trayChoiceText(choice: TrayChoice): string;
  ```

- [ ] **Step 1: Escrever os testes**

```ts
it('usa a bandeja de menor número com posição livre', () => {
  expect(trayForNewSplice([{ trayNumber: 1, capacity: 2, usedPositions: 2 }, { trayNumber: 2, capacity: 12, usedPositions: 0 }], [], null))
    .toEqual({ kind: 'existing', trayNumber: 2 });
});
it('conta as fusões quando a bandeja não traz usedPositions', () => {
  expect(trayForNewSplice([{ trayNumber: 1, capacity: 1 }], [{ trayNumber: 1 }], null)).toEqual({ kind: 'create', trayNumber: 2, capacity: 12 });
});
it('sem bandeja cria a 1 com 12 posições', () => {
  expect(trayForNewSplice([], [], null)).toEqual({ kind: 'create', trayNumber: 1, capacity: 12 });
});
it('respeita o máximo de bandejas da caixa', () => {
  expect(trayForNewSplice([{ trayNumber: 1, capacity: 1, usedPositions: 1 }], [], 1)).toEqual({ kind: 'full' });
});
it('o cabo que chega é a entrada; o que sai, a saída, com as pontas usadas', () => {
  expect(spliceSides({ fiberId: 'x', role: 'START' }, { fiberId: 'y', role: 'END' }))
    .toEqual({ inputFiberId: 'y', inputFiberEnd: 'B', outputFiberId: 'x', outputFiberEnd: 'A' });
});
it('mesmo papel: a primeira tocada é a entrada (sangria no mesmo cabo que passa)', () => {
  expect(spliceSides({ fiberId: 'x', role: 'PASS_THROUGH' }, { fiberId: 'y', role: 'PASS_THROUGH' }))
    .toEqual({ inputFiberId: 'x', inputFiberEnd: 'B', outputFiberId: 'y', outputFiberEnd: 'A' });
});
it('frases da bandeja', () => {
  expect(trayChoiceText({ kind: 'existing', trayNumber: 1 })).toBe('Vai para a bandeja 1, na próxima posição livre.');
  expect(trayChoiceText({ kind: 'create', trayNumber: 2, capacity: 12 })).toBe('Vou criar a bandeja 2 (12 posições).');
  expect(trayChoiceText({ kind: 'full' })).toBe('Esta caixa não comporta mais bandejas.');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `--include src/app/core/network/splice-plan.spec.ts` → "Could not resolve".
- [ ] **Step 3: Implementar** — ordem de papel para a entrada: END < PASS_THROUGH = sem papel < START; empate mantém a ordem dos argumentos. Pontas: entrada `usedEnd(role,'in')`, saída `usedEnd(role,'out')`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Registrar** — `feat: choose tray and fiber ends for a new splice`.

---

### Task 3: Store — emendar criando a bandeja se preciso

**Files:**
- Modify: `src/app/features/network-map/box-sheet/box-sheet-store.ts` (ao lado de `saveSplice`)
- Test: `src/app/features/network-map/box-sheet/box-sheet-store.spec.ts`

**Interfaces:**
- Consumes: `TrayChoice`, `SpliceSides`, `trayChoiceText` (Task 2); `TrayApi.create`, `SpliceApi.create`.
- Produces: `spliceFibers(choice: TrayChoice, sides: SpliceSides, done: (error: string | null, spliceId?: string) => void): void`.

- [ ] **Step 1: Escrever os testes** (no padrão de mocks do spec atual)

```ts
it('cria a bandeja e depois a fusão, sem posição, e devolve o id', () => {
  store.spliceFibers({ kind: 'create', trayNumber: 2, capacity: 12 }, sides, done);
  expect(trayApi.create).toHaveBeenCalledWith('box1', { trayNumber: 2, capacity: 12 });
  expect(spliceApi.create).toHaveBeenCalledWith('box1', { trayNumber: 2, ...sides });
  expect(done).toHaveBeenCalledWith(null, 's9');
});
it('bandeja existente: só a fusão', () => { /* trayApi.create não chamado */ });
it('caixa cheia: nenhuma chamada e a frase', () => {
  store.spliceFibers({ kind: 'full' }, sides, done);
  expect(spliceApi.create).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledWith('Esta caixa não comporta mais bandejas.');
});
it('erro devolve a frase traduzida e libera o salvar', () => { /* spliceApi.create → throwError(409 ProblemDetail) ; done(mensagem); saving() false */ });
it('ignora um segundo pedido enquanto salva', () => { /* create devolve Subject; segunda chamada não chama de novo */ });
```

- [ ] **Step 2: Rodar e ver falhar** — `--include src/app/features/network-map/box-sheet/box-sheet-store.spec.ts` → TS2339 `spliceFibers`.
- [ ] **Step 3: Implementar** — `concatMap` de `trayApi.create` (quando `create`) para `spliceApi.create`; sucesso: `saving=false`, `notifications.success('Emenda registrada.')`, `done(null, response.id)`, `reload()`; erro: `saving=false`, `done(parseApiError(error).message)`, e `reload()` se a bandeja chegou a ser criada.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Registrar** — `feat: splice two fibers creating a tray when needed`.

---

### Task 4: Componentes da lista e da gaveta

**Files:**
- Create: `src/app/features/box-splices/fiber-list.ts`, `fiber-list.html`, `fiber-list.scss`, `fiber-list.spec.ts`
- Create: `src/app/features/box-splices/fiber-drawer.ts`, `fiber-drawer.html`, `fiber-drawer.scss`, `fiber-drawer.spec.ts`

**Interfaces:**
- Consumes: `CableView`, `FiberRow`, `SplitterView` (Task 1); `TrayChoice`, `trayChoiceText` (Task 2); `app-fiber-dot`, `app-diagram-line` + `diagramEnd`, `SpliceDetailComponent` (existentes).
- Produces:
  - `app-fiber-list`: inputs `cables: readonly CableView[]`, `splitters: readonly SplitterView[]`, `selectedFiberId: string | null`, `blocked: ReadonlyMap<string, string>` (fibra → motivo, só no modo escolher); `tab = model<string>('')` (cableId ou `'splitters'`; vazio = primeiro cabo). Outputs `fiberTap: FiberRow`, `splitterTap: string`, `openCable: string`. Atributos de teste: `[data-cable-tab]`, `[data-tube]`, `[data-fiber]` (= fiber.id), `[data-splitter]`.
  - `app-fiber-drawer`: inputs `row: FiberRow | null`, `splitter: SplitterView | null`, `splice: SpliceResponse | null`, `pending: { from: FiberRow; to: FiberRow; choice: TrayChoice } | null`, `error: string | null`, `canEdit: boolean`, `saving: boolean`. Outputs `startSplice: void`, `confirm: void`, `cancel: void`, `trace: { kind: 'SPLICE' | 'FIBER' | 'SPLITTER'; id: string }`, `undo: SpliceResponse`, `viewCable: string`, `closed: void`. Atributos: `[data-action="emendar"]`, `[data-action="confirmar"]`, `[data-action="cancelar"]`, `[data-action="caminho"]`.

- [ ] **Step 1: Escrever os testes** (`{ timeout: 20000 }`)

fiber-list:
```ts
it('uma aba por cabo com o papel e a aba Splitters quando houver');      // textos "CABO-01 · chega aqui", "Splitters"
it('mostra as fibras do cabo da aba com a cor e o destino');               // "1 Verde" e "→ BACKBONE · Verde 1"
it('o cabeçalho do tubo recolhe e abre as fibras');
it('tocar numa fibra emite a linha');                                       // fiberTap → row.fiber.id
it('no modo escolher, fibra bloqueada fica desabilitada com o motivo');     // blocked.get(id) visível, botão disabled
it('cabo vazio mostra a frase e Abrir ficha do cabo');                      // "Este cabo ainda não tem fibras."
```
fiber-drawer:
```ts
it('fibra livre: frase e Emendar (só com canEdit)');                        // "Esta fibra está livre nesta caixa."
it('passa direto: frase própria e Emendar');                                // "Esta fibra passa direto pela caixa, sem emenda."
it('fibra emendada mostra o cartão da emenda (bandeja e posição)');          // app-splice-detail presente
it('fibra no splitter: desenho e grade de saídas com cliente');              // "Maria", "Ver o caminho"
it('emenda pendente: desenho, frase da bandeja, Emendar e Cancelar');        // trayChoiceText; confirmar desabilitado se saving ou choice full
it('mostra o erro do servidor na própria gaveta');                           // role="alert"
it('rompida, reservada e em outra caixa: só a frase, sem ações');
it('conector e porta de atendimento: desenho, frase e Ver o caminho (FIBER)');
it('aba Splitters: entrada e grade de saídas; Ver o caminho (SPLITTER)');
```

- [ ] **Step 2: Rodar e ver falhar** — `--include src/app/features/box-splices/fiber-list.spec.ts --include src/app/features/box-splices/fiber-drawer.spec.ts`.
- [ ] **Step 3: Implementar** — lista: botões nativos (não `mat-list`), linha ≥ 40px, bolinha `app-fiber-dot`, nome `"{n} {Cor}"`; tubos todos abertos por padrão (estado de recolhido local por cabo+tubo). Gaveta: caso "emendada" delega a `app-splice-detail` (repassa `viewCable`, `traceSplice`→`trace({kind:'SPLICE'})`, `deleteRequested`→`undo`, `closed`); demais casos usam `app-diagram-line`; "Ver o caminho" emite `FIBER` (conector/porta) ou `SPLITTER`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Registrar** — `feat: fiber list by cable and drawer for the splice diagram`.

---

### Task 5: Página reescrita sobre a lista e a gaveta

**Files:**
- Modify: `src/app/features/box-splices/box-splices-page.ts`, `.html`, `.scss`
- Modify: `src/app/features/box-splices/box-splices-page.spec.ts` (troca os testes de bandeja pelos abaixo)

**Interfaces:**
- Consumes: tudo das Tasks 1–4; `BoxSheetStore` (`overview`, `fiberIndex`, `trays`, `splices`, `saving`, `spliceFibers`, `deleteSplice`, `deleteTray`); `fiberPick` (`splice-board.ts`) para o mapa `blocked`; `defaultSpliceCables`; `MapReturnService`; `TraceStore` não é usado aqui (o rastreio volta ao mapa por `?trace=`, como hoje).
- Produces: a rota `/caixas/:boxId/fusoes` com o diagrama. Estado da página: `selection = signal<{ kind: 'fiber'; id: string } | { kind: 'splitter'; id: string } | { kind: 'splice'; id: string } | null>`, `choosing = signal<{ fromFiberId: string } | null>`, `target = signal<string | null>` (fibra de destino), `drawerError = signal<string | null>`.

- [ ] **Step 1: Atualizar o spec** (mantém os testes de cabeçalho, voltar ao mapa, erro de carga e "só lê sem permissão"; remove os de bandeja)

```ts
it('lista as fibras do primeiro cabo que chega com o destino');
it('tocar numa fibra abre a gaveta; tocar fora (Fechar) fecha');
it('emendar: Emendar → escolhe na aba do outro cabo → confirma e chama spliceFibers com bandeja e pontas');
it('após emendar, a gaveta mostra a emenda nova');           // done(null, 's9') → selection { kind: 'splice', id: 's9' }
it('erro ao emendar aparece na gaveta e mantém a escolha');
it('Cancelar sai do modo escolher sem chamar nada');
it('rodapé das bandejas: ocupação e Excluir só na bandeja vazia');
it('caixa sem cabos mostra a frase e Voltar ao mapa');
it('sem permissão: sem Emendar nem Excluir');
```

- [ ] **Step 2: Rodar e ver falhar** — `--include src/app/features/box-splices/box-splices-page.spec.ts`.
- [ ] **Step 3: Implementar** — `cables = computed(() => boxFiberMap(overview, fiberIndex))`; gaveta lê a seleção **pelo id** nos dados atuais (some sozinha se o item sumir). Modo escolher: aviso fixo no topo com "Cancelar"; `tab` vai para o cabo de `defaultSpliceCables` que não é o da fibra de origem (ou o mesmo, se só houver um); `blocked` = fibras cujo `fiberPick(info, row.end, { boxId, splices, chosenOther: fromFiberId })` não é livre. Confirmar: `spliceFibers(trayForNewSplice(trays, splices, box.trayCapacity), spliceSides(...))`. Rodapé: `"Bandejas: {n} · {usados}/{capacidade}"` por bandeja, "Excluir" (confirmação existente) só nas vazias e com `canEdit`. Layout: ≥ 900px lista à esquerda e gaveta como painel da direita (`has-panel`); < 900px gaveta fixa embaixo, até 60dvh, rolando.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Registrar** — `feat: splice diagram page replaces the tray board`.

---

### Task 6: Limpeza, docs e verificação final

**Files:**
- Delete: `src/app/features/box-splices/tray-board.*`, `cable-strip.*`, `splice-picker.*` (se nada mais os importar — conferir com Grep antes).
- Modify: `src/app/core/network/splice-board.ts` + spec (remover `trayPositions`/`unplacedSplices`/`pickHint` só se ficarem sem uso).
- Modify: `docs/SPECS.md` (§2 linhas dos arquivos novos e removidos; RI-32/33 reescritos como "Diagrama de fusões"), `docs/GUIA.md` (seção da tela de fusões: abas, gaveta, emendar em dois toques, bandeja automática), `README.md` (linha de `features/box-splices/`), `CLAUDE.md` (tabela, situação, decisões tomadas sem o dono do design), status do design e deste plano.

- [ ] **Step 1:** Grep por `TrayBoardComponent|CableStripComponent|SplicePickerComponent|trayPositions|unplacedSplices|pickHint`; apagar só o que tiver zero usos fora dos próprios arquivos/specs.
- [ ] **Step 2:** Atualizar as docs acima.
- [ ] **Step 3:** `npx ng test --watch=false` → todos passam, sem "Unhandled".
- [ ] **Step 4:** `npx ng build` → EXIT 0.
- [ ] **Step 5: Registrar** — lista de arquivos e a mensagem `feat: splice diagram for boxes (list by cable, drawer, two-tap splicing)`; anotar a conferência no navegador como pendência (celular e computador, claro e escuro, emendar criando bandeja, sangria no mesmo cabo).
