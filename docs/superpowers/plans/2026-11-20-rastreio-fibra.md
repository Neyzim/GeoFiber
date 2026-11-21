# Rastreio da fibra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar, a partir de uma fibra, caixa, splitter ou fusão, o caminho do sinal até a OLT ou até os clientes, em lista e no mapa, com os pontos quebrados marcados.

**Architecture:** O backend calcula a travessia (`GET /api/v1/trace/{kind}/{id}`) e devolve passos, ramos e quebras. O front só lê a resposta: regras puras montam a lista e o desenho, um store guarda a consulta, uma ficha mostra o resultado e o mapa recebe o traçado e os marcadores vermelhos.

**Tech Stack:** Angular 22 (standalone, signals, OnPush, zoneless), Leaflet 1.9, Vitest, tipos gerados de `core/api/generated/schema.d.ts`.

**Spec:** `docs/superpowers/specs/2026-11-20-rastreio-fibra-design.md`

## Global Constraints

- Textos de tela em pt-BR simples; nenhum código do backend (`FREE`, `NO_SIGNAL`, `LOOP`, `DEPTH_LIMIT`, `SPLITTER_PORT`) aparece na tela.
- Tipos seguem o backend (`npm run api:types`); se faltar algo no backend, avisar o dono e não contornar no front.
- Rastreio é só leitura: não usa `NetworkMapState.canEdit`, não grava nada.
- Specs de componentes pesados (Material ou Leaflet) usam `describe(..., { timeout: 20000 }, ...)`.
- Mocks de `NotificationService.apiError` retornam `parseApiError(error)`.
- Docs atualizadas junto com cada tarefa: `docs/SPECS.md` (módulos §2, RI-36 em diante), `docs/GUIA.md`, `README.md`, `CLAUDE.md`.
- Sem Git: nada de add/commit/branch. No fim, listar os arquivos alterados e sugerir a mensagem de commit.
- Bash: heredoc com apóstrofo falha; usar a ferramenta Write ou script Python com `python -I`.

## Decisões de plano (do design, fechadas aqui)

- **Ruling 1 — `traceRef` do splitter:** é o `id` da porta do splitter. Para abrir uma saída, o front chama `GET /api/v1/trace/SPLITTER_PORT/{traceRef}?direction=DOWNSTREAM`. O design não listava `SPLITTER_PORT`; **o dono precisa acrescentar esse kind no backend**. Custo se errado: a saída não abre (mostrar aviso "Não foi possível abrir esta saída").
- **Ruling 2 — marcadores de quebra no mapa:** o `GeoMap` ganha um input novo `markers` (pontos vermelhos somente leitura). Não reaproveita `elements`, para não misturar com o que se pode arrastar. Custo se errado: retrabalho pequeno no componente.
- **Ruling 3 — entrada pela tela de fusões:** o botão "Rastrear" da fusão navega para `/` com o rastreio já aberto (`?trace=SPLICE:<id>`). Custo se errado: a tela de fusões perde o contexto ao voltar.
- **Ruling 4 — uma ficha por vez:** o rastreio é uma ficha própria, provida pela página do mapa; abrir o rastreio fecha as outras fichas, e vice-versa (regra "só uma ficha aparece").

## Review Focus

1. Quebra `LOOP` (laço) vira frase clara ("Este caminho volta sobre si mesmo.") e não some da lista — teste em Task 2.
2. Quebra `DEPTH_LIMIT` mostra aviso de limite, não "sem ligação" — teste em Task 2.
3. Splitter sem nenhuma saída ligada: resumo "Nenhuma saída ligada ainda", não lista vazia — teste em Task 2.
4. Resposta de uma saída que chega depois de outra já aberta é descartada — teste em Task 3.
5. Erro 404 (ponto inicial não existe) mostra "Não encontramos este item na rede." na ficha — teste em Task 4.
6. Quebra sem coordenada: o marcador vai para a caixa, não some — teste em Task 5.

## Task 0: Contrato da API (dependência do backend)

**Pré-condição:** o dono implementa `GET /api/v1/trace/{kind}/{id}` (com `SPLITTER_PORT`) no backend e roda `npm run api:types`.

**Files:**
- Create: `src/app/core/api/trace-types.ts`
- Test: `src/app/core/api/trace-types.spec.ts`

**Interfaces:**
- Produces: `TraceKind`, `TraceDirection`, `TraceResponse`, `TraceStep`, `TraceBreak`, `TraceBranch` como apelidos de `components['schemas']` gerados.

- [ ] **Step 1: Confirmar o schema gerado**

Run: `npm run api:types`, depois procurar `/api/v1/trace` em `src/app/core/api/generated/schema.d.ts`.
Expected: rota presente com `kind` aceitando `FIBER_END`, `FIBER`, `BOX`, `SPLITTER`, `SPLICE`, `SPLITTER_PORT`.
Se a rota não existir, **parar** e avisar o dono; as tarefas 1 a 7 não começam.

- [ ] **Step 2: Escrever o teste de tipo**

Teste que importa cada apelido e atribui um objeto de exemplo (um passo de cabo, uma quebra, um ramo) e confere `kind`. Deve falhar enquanto `trace-types.ts` não existir.

- [ ] **Step 3: Criar `trace-types.ts`** com os apelidos (uma linha cada, sem tipo escrito à mão).

- [ ] **Step 4: Rodar** `npx ng test --watch=false --include src/app/core/api/trace-types.spec.ts` — Expected: passa; `Unhandled` ausente.

## Task 1: Regras puras de montagem (lista e textos)

**Files:**
- Create: `src/app/core/network/trace-view.ts`
- Test: `src/app/core/network/trace-view.spec.ts`

**Interfaces:**
- Consumes: `TraceResponse`, `TraceBreak`, `TraceBranch` (Task 0).
- Produces:
  - `breakMessage(reason: TraceBreakReason): string` — frases pt-BR: `NO_CONNECTION` → "Esta ponta não está ligada a nada."; `NO_SIGNAL` → "Esta porta não recebe sinal."; `NO_CUSTOMER` → "Esta porta não atende nenhum cliente."; `LOOP` → "Este caminho volta sobre si mesmo."; `DEPTH_LIMIT` → "O caminho é longo demais para mostrar tudo."
  - `headline(response: TraceResponse): string` — `REACHED_OLT` → "Chega à OLT"; `REACHED_CUSTOMERS` → "Chega aos clientes"; `BROKEN` → "Caminho interrompido"; `EMPTY` → "Nada ligado a este ponto".
  - `branchLine(branch: TraceBranch): string` — "Saída 3: 4 clientes" / "Saída 2: livre" / "Saída 5: interrompida"; `FREE` sem cliente → "livre".
  - `splitterSummary(branches: readonly TraceBranch[]): string` — "8 saídas: 5 com cliente, 3 livres"; lista vazia ou sem ligação → "Nenhuma saída ligada ainda".

- [ ] **Step 1: Escrever os testes** cobrindo cada frase acima com valores exatos, inclusive `LOOP`, `DEPTH_LIMIT` e splitter sem saída ligada (Review Focus 1–3).
- [ ] **Step 2: Rodar e ver falhar** (`npx ng test --watch=false --include src/app/core/network/trace-view.spec.ts`). Expected: FAIL, módulo não existe.
- [ ] **Step 3: Implementar** as quatro funções, com as frases literais acima.
- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

## Task 2: Cliente HTTP da travessia

**Files:**
- Create: `src/app/core/api/resources/trace-api.ts`
- Test: `src/app/core/api/resources/trace-api.spec.ts`

**Interfaces:**
- Consumes: `TraceKind`, `TraceDirection`, `TraceResponse` (Task 0).
- Produces: `TraceApi.trace(kind: TraceKind, id: string, direction: TraceDirection): Observable<TraceResponse>` — `GET apiUrl(base, 'trace', kind, id)` com query `direction`.

- [ ] **Step 1: Teste** com `HttpTestingController`: confere URL `…/api/v1/trace/SPLITTER_PORT/<uuid>?direction=DOWNSTREAM` e que a resposta chega. Falha antes da implementação.
- [ ] **Step 2: Implementar** seguindo `import-api.ts` como modelo (`inject(HttpClient)`, base de `API_BASE`).
- [ ] **Step 3: Rodar** o spec. Expected: PASS.

## Task 3: Store da consulta

**Files:**
- Create: `src/app/features/trace/trace-store.ts`
- Test: `src/app/features/trace/trace-store.spec.ts`

**Interfaces:**
- Consumes: `TraceApi` (Task 2), `TraceKind`, `TraceDirection`.
- Produces: `@Injectable()` `TraceStore` com:
  - signals: `state: 'idle' | 'loading' | 'ready' | 'error'`, `kind`, `id`, `direction`, `response`, `error`.
  - métodos: `open(kind, id, direction?)` (padrão `UPSTREAM`), `setDirection(d)`, `openBranch(traceRef)` (troca para `SPLITTER_PORT`, `DOWNSTREAM`, guarda a origem para "Voltar"), `back()`, `close()`.
  - Regra: resposta de uma consulta anterior à atual é descartada (Review Focus 4). Erro 404 vira `error` com "Não encontramos este item na rede." (Review Focus 5).

- [ ] **Step 1: Testes** com `TraceApi` mockado: (a) `open` vai a `loading` e depois `ready`; (b) `openBranch` chamada duas vezes, a primeira respondendo depois da segunda, é descartada; (c) 404 vira erro com a frase exata; (d) `close` zera o estado. Falham antes.
- [ ] **Step 2: Implementar.** Uso de `takeUntilDestroyed` ou um contador de versão para descartar respostas antigas.
- [ ] **Step 3: Rodar** o spec. Expected: PASS.

## Task 4: Ficha do rastreio

**Files:**
- Create: `src/app/features/trace/trace-sheet.ts`, `trace-sheet.html`, `trace-sheet.scss`
- Test: `src/app/features/trace/trace-sheet.spec.ts` (`describe(..., { timeout: 20000 }, ...)`)

**Interfaces:**
- Consumes: `TraceStore` (Task 3), `headline`, `breakMessage`, `branchLine`, `splitterSummary` (Task 1); moldura de `features/network-map/sheet-frame.scss`.
- Produces: `app-trace-sheet`, com saída `closed`. Mostra: título "Por onde passa o sinal", botões **Até a OLT** / **Até os clientes** (pt-BR, troca `direction`), a `headline`, a lista de passos em ordem, as quebras em destaque vermelho com `breakMessage`, e para splitter o resumo com cada saída (`branchLine`) e botão "Ver clientes desta saída" → `openBranch`. Botão "Voltar" aparece quando há origem guardada.

- [ ] **Step 1: Testes:** com o store de teste, confere a frase de cada passo, a frase de quebra, o resumo do splitter e o botão Voltar. Falham antes.
- [ ] **Step 2: Implementar** o componente com `input`/`output` e OnPush; estilos com tokens `--gf-*`.
- [ ] **Step 3: Rodar** o spec. Expected: PASS; `Unhandled` ausente.

## Task 5: Marcadores de quebra no mapa

**Files:**
- Modify: `src/app/shared/map/geo-map.ts` (input `markers`), `geo-map.html` se o template precisar.
- Create: `src/app/core/network/trace-map.ts`, `src/app/core/network/trace-map.spec.ts`
- Test: `src/app/shared/map/geo-map.spec.ts` (já existe; acrescentar caso)

**Interfaces:**
- Produces:
  - `tracePaths(response: TraceResponse): GeoPath[]` — um `GeoPath` por passo de cabo com `coordinates`, cor pela direção (OLT e clientes têm cores diferentes, usar tokens já definidos em `network-catalog`).
  - `traceMarkers(response: TraceResponse): TraceMarker[]` — `{ key, point: GeoPoint, message: string }` por quebra; se a quebra não tem coordenada, usa a posição da caixa (fallback). Quebra sem nenhuma posição é omitida e conta em `hidden` (Review Focus 6).
  - `GeoMap.markers: input<readonly TraceMarker[]>` — desenha círculo vermelho, não arrastável, com `message` no popup.

- [ ] **Step 1: Testes** de `tracePaths` e `traceMarkers` (inclui fallback para caixa) e um teste do `GeoMap` confirmando que o input `markers` cria um marcador por item. Falham antes.
- [ ] **Step 2: Implementar.** No `GeoMap`, usar a mesma camada de desenho dos outros marcadores, sem `dragend`.
- [ ] **Step 3: Rodar** os specs. Expected: PASS.

## Task 6: Entradas e integração na página do mapa

**Files:**
- Modify: `src/app/features/network-map/network-map-page.ts` (provide `TraceStore`, abrir/fechar a ficha, passar `paths` e `markers` ao mapa, ler `?trace=` da URL)
- Modify: `src/app/features/network-map/box-sheet/box-sheet.ts/.html`, `cable-sheet/cable-sheet.ts/.html` (botão "Rastrear"), `olt-sheet` não recebe botão.
- Modify: `src/app/features/box-splices/box-splices-page.ts/.html` (botão "Rastrear" na fusão → `/?trace=SPLICE:<id>`)
- Test: `network-map-page.spec.ts`, `box-sheet.spec.ts`, `cable-sheet.spec.ts`, `box-splices-page.spec.ts` (acrescentar casos).

**Interfaces:**
- Consumes: `TraceStore`, `tracePaths`, `traceMarkers`, `app-trace-sheet`.
- Produces: botões "Rastrear" com `data-trace` nas fichas (caixa: `BOX`; cabo por fibra: `FIBER`; splitter: `SPLITTER`) e na fusão (`SPLICE`). Ruling 3 e 4 valem aqui.

- [ ] **Step 1: Testes:** clicar "Rastrear" na caixa chama `TraceStore.open('BOX', id)`; abrir o rastreio fecha a ficha da caixa; `?trace=SPLICE:<id>` abre a ficha ao carregar a página. Falham antes.
- [ ] **Step 2: Implementar** as entradas e a ligação com a página. `StubGeoMap` nos specs da página (Leaflet não roda no jsdom).
- [ ] **Step 3: Rodar** os quatro specs. Expected: PASS.

## Task 7: Documentação e suíte final

**Files:**
- Modify: `docs/SPECS.md` (módulos §2 e RI-36 em diante: rastreio é leitura, uma ficha por vez, descarte de respostas antigas), `docs/GUIA.md` (seção "Rastrear o caminho da fibra" com a linguagem da tela), `README.md` (linhas das pastas novas), `CLAUDE.md` (tabela de pastas, situação, decisões e pendências), `docs/superpowers/specs/2026-11-20-rastreio-fibra-design.md` (status "implementado"), este plano (estado).

- [ ] **Step 1: Atualizar as docs** acima.
- [ ] **Step 2: Rodar a suíte inteira**: `npx ng test --watch=false > <scratchpad>/suite-trace.txt 2>&1`, depois procurar `Test Files`, `Tests  ` e `Unhandled` no arquivo. Expected: todos passando, sem `Unhandled`.
- [ ] **Step 3: Rodar o build**: `npx ng build`. Expected: exit 0.
- [ ] **Step 4: Listar os arquivos alterados** e sugerir a mensagem de commit: `feat: trace fiber path from box, cable, splitter and splice`.

## Pendências para o dono (fora do front)

- Endpoint `GET /api/v1/trace/{kind}/{id}` com o kind `SPLITTER_PORT` (Ruling 1).
- Conferir no backend a regra do splitter sem porta de atendimento e o limite de 50 passos.

## Self-Review

- **Cobertura do design:** endpoint (Task 0, owner), lista e mapa (Tasks 1, 4, 5), entradas (Task 6), quebras no mapa (Task 5), resumo do splitter e saídas sob demanda (Tasks 3 e 4), documentação (Task 7). Sem lacunas.
- **Tipos:** `TraceStore`, `TraceApi.trace`, `breakMessage`, `tracePaths`, `traceMarkers` usados com o mesmo nome em todas as tarefas.
- **Revisão:** os seis itens de Review Focus têm teste na tarefa dona.

---

**Plan complete and saved to `docs/superpowers/plans/2026-11-20-rastreio-fibra.md`.** Please review the plan. Which execution approach would you prefer?

- **Subagent-driven**: um implementador novo por tarefa e um revisor antes da próxima. Mais cuidadoso, custa um contexto novo por tarefa.
- **Native**: eu implemento tudo nesta sessão e um revisor faz a revisão final do conjunto. Mais barato e rápido, sem revisão por tarefa.

Recomendo **Native**, porque as tarefas dependem pouco umas das outras e o desenho já fixa as interfaces. Mas a Task 0 depende do dono implementar o endpoint antes de tudo. Você aprova o plano como está e escolhe a forma de execução?
