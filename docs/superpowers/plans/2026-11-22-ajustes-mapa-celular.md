# Ajustes do mapa (excluir pela ficha e celular) Implementation Plan

> **For agentic workers:** executado inline (o dono pediu "pode seguir"). Steps em checkbox.

**Goal:** Excluir caixa/OLT/cabo pela ficha e deixar o mapa usável no celular (painel recolhido, ajuda
escondida, "Toque aqui para editar", foco acima da gaveta, gaveta arrastável, faixa "Criar …").

**Architecture:** Regras puras novas em `core/network/sheet-drag.ts`; diretiva `appSheetDrag` em
`shared/common/`; componente `app-create-banner` em `shared/map/`; o resto é ligação na página do mapa,
nas fichas e no `app-geo-map`.

**Tech Stack:** Angular 22 (signals, zoneless, OnPush), Angular Material, Leaflet 1.9, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-ajustes-mapa-celular-design.md`

## Global Constraints

- Sem Git (só `status`/`diff`); cada tarefa termina em "Registrar" com a mensagem sugerida.
- TDD; no fim `npx ng test --watch=false` (procurar "Unhandled") e `npx ng build`.
- Textos em pt-BR simples. Celular = largura < 900px (`max-width: 899.98px`).
- Gaveta: abre em 35% da altura, máximo 90% (revisão do dono; era 50%), soltar abaixo de 20% fecha.
- Exclusão sempre pede confirmação; escrita pessimista.

## Review Focus

1. Toque simples na alça (sem arrastar) não fecha a ficha — teste na Task 3 (`dragEnd` sem movimento).
2. Arrastar além de 90% não passa do máximo — Task 3.
3. Usuário sem `canEdit` não vê o menu ⋮ nem o botão do balão — Tasks 1 e 4.
4. Faixa "Criar …" some ao sair da ferramenta (ESC/X) — Task 5.
5. Botão do balão não cria elemento nem tira a seleção (o clique não chega ao mapa) — conferência no navegador (Leaflet não roda no jsdom).

---

### Task 1: Excluir pela ficha (caixa, OLT, cabo)

**Files:** Modify `features/network-map/{box-sheet,olt-sheet,cable-sheet}/*.{ts,html}` e specs;
`network-map-page.{ts,html}`.

**Interfaces:** cada ficha ganha `readonly remove = output<void>()`; no topo, com `canEdit()`, botão
`mat-icon-button` `aria-label="Mais ações"` (`more_vert`) abrindo `mat-menu` com item `data-action="excluir"`
"Excluir". Página: `removeSelectedElement()` e `removeSelectedCable()` reaproveitam `confirmDelete`.

- [ ] Teste em cada spec: com `canEdit` true, abrir "Mais ações" e clicar "Excluir" emite `remove`; com
  `canEdit` false, não há botão "Mais ações". Ver falhar.
- [ ] Implementar; ligar `(remove)` na página. Ver passar.
- [ ] Registrar: `feat: delete box, OLT and cable from their sheets`.

### Task 2: Painel lateral recolhido e ajuda escondida com ficha no celular

**Files:** `network-sidebar.ts` + spec; `network-map-page.{ts,html,scss}`.

- [ ] Teste no `network-sidebar.spec.ts`: o host começa com a classe `is-collapsed`. Ver falhar.
- [ ] `collapsed = signal(true)`. Ver passar.
- [ ] Página: `anySheetOpen = computed(...)` (elemento, cabo, rastreio ou impacto) → classe
  `project__help--hidden-mobile` que dá `display: none` abaixo de 900px. (Sem spec: página não roda no jsdom.)
- [ ] Registrar: `feat: start with sidebar collapsed and hide help behind mobile sheets`.

### Task 3: Gaveta arrastável

**Files:** Create `core/network/sheet-drag.ts` + spec; `shared/common/sheet-drag.directive.ts` + spec;
Modify `sheet-frame.scss` e as seis fichas (box, olt, cable, customer, trace, impact).

**Interfaces:**
- `SHEET_OPEN = 0.35`, `SHEET_MAX = 0.5`, `SHEET_DISMISS = 0.2`.
- `dragHeight(startFraction: number, deltaY: number, viewport: number): number` — fração nova, limitada a
  `[0, SHEET_MAX]` (puxar para cima = deltaY negativo aumenta).
- `dragEnd(fraction: number): 'dismiss' | number` — `< SHEET_DISMISS` → `'dismiss'`, senão a fração.
- Diretiva `[appSheetDrag]` no `<aside class="sheet">`: alça `.sheet__grip` (filho com
  `data-sheet-grip`) recebe pointerdown/move/up; escreve `--gf-sheet-height` (em `dvh`) no host; saída
  `(sheetDismiss)`. Só age quando `matchMedia('(max-width: 899.98px)')` casa.

- [ ] Testes puros: `dragHeight(0.35, -1000, 1000)` = 0.5; `dragHeight(0.35, 100, 1000)` ≈ 0.25;
  `dragHeight(0.35, 1000, 1000)` = 0; `dragEnd(0.19)` = 'dismiss'; `dragEnd(0.2)` = 0.2. Ver falhar.
- [ ] Implementar. Ver passar.
- [ ] Teste da diretiva (host de teste): pointerdown no grip em y=500, pointermove y=900, pointerup com
  `innerHeight` 1000 → emite `sheetDismiss`; pointerdown/pointerup sem mover não emite; mover para y=300
  deixa `--gf-sheet-height: 50dvh`. Ver falhar, implementar, ver passar.
- [ ] Fichas: `<div class="sheet__grip" data-sheet-grip aria-hidden="true"></div>` no topo e
  `appSheetDrag (sheetDismiss)="closed.emit()"`; CSS: no celular `height: var(--gf-sheet-height, 35dvh)`,
  alça visível só no celular.
- [ ] Registrar: `feat: draggable bottom sheet on mobile`.

### Task 4: "Toque aqui para editar" e foco acima da gaveta

**Files:** `shared/map/pin-marker.ts` + spec; `shared/map/geo-map.ts`; `network-map-page.{ts,html}`;
`core/services/map-viewport.ts`.

**Interfaces:** `PopupContent.action?: string | null` → `<button type="button" class="gf-popup__action"
data-popup-action="edit">texto</button>`; `elementPopupHtml(element, extra, hint, action?)`.
`app-geo-map` ganha `readonly popupEdit = output<void>()`. `MapViewport.focus(point, zoom?, bottomInset = 0)`.

- [ ] Teste em `pin-marker.spec.ts`: `popupHtml({... action: 'Toque aqui para editar'})` contém
  `data-popup-action="edit"` e o texto; sem `action`, nenhum botão. Ver falhar, implementar, ver passar.
- [ ] `geo-map`: balão do elemento usa `action` em vez de `hint`; ouvinte de clique no elemento do popup
  (uma vez) que emite `popupEdit` ao achar `[data-popup-action="edit"]`. Página: cabo também usa a ação;
  `(popupEdit)` → edita elemento ou cabo selecionado.
- [ ] `focus` com `bottomInset`: projeta o ponto no zoom alvo, soma `bottomInset/2` em y e voa para o
  ponto desprojetado. Página passa `innerHeight * SHEET_OPEN` no celular.
- [ ] Registrar: `feat: tap-to-edit button in map popup and focus above mobile sheet`.

### Task 5: Faixa "Criar …"

**Files:** Create `shared/map/create-banner.{ts,html,scss,spec.ts}`; `network-map-page.{ts,html,scss}`.

**Interfaces:** `app-create-banner` com `label = input.required<string>()`, saídas `reopen` e `cancel`;
botão principal "Criar {label}" (`data-action="reabrir"`), botão X `aria-label="Encerrar criação"`.

- [ ] Testes: mostra "Criar CTO"; clicar no texto emite `reopen`; clicar no X emite `cancel`. Ver falhar,
  implementar, ver passar.
- [ ] Página: `onElementTypePicked`/`onRolePicked` fecham a escolha (`pickerVisible.set(false)`);
  `createLabel` computado (grupo → `label`; cabo → `cabo de {função}`); faixa só com `isCreating() &&
  !pickerVisible()`; `reopen` → `pickerVisible.set(true)`; `cancel` → `setTool('select')`.
- [ ] Registrar: `feat: create banner replaces type picker after choosing`.

### Task 6: Documentação e verificação

- [ ] `docs/SPECS.md` RI-40; `docs/GUIA.md` (excluir pela ficha, gaveta, "Toque aqui para editar",
  faixa "Criar"); `README.md`; `CLAUDE.md` (situação, decisões, pendência de conferir no navegador).
- [ ] Suíte inteira + build; anotar números.
