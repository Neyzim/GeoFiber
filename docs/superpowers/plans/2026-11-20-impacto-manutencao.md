# Impacto de manutenção Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Para um cabo, uma caixa ou uma OLT, mostrar quais clientes, caixas e OLTs ficam sem sinal se ele sair, em lista (agrupada por caixa) e no mapa.

**Architecture:** O backend calcula o impacto (`GET /api/v1/impact/{cables|boxes|olts}/{id}`) e devolve clientes, caixas, OLTs e as posições. O front só lê: regras puras montam o resumo e os marcadores, um store guarda a consulta, uma ficha mostra a lista e o mapa destaca o item e os afetados.

**Tech Stack:** Angular 22 (standalone, signals, OnPush, zoneless), Leaflet 1.9, Vitest, tipos gerados de `core/api/generated/schema.d.ts`.

**Spec:** `docs/superpowers/specs/2026-11-20-impacto-manutencao-design.md`

## Global Constraints

- Textos de tela em pt-BR simples; nenhum código do backend (`CABLE`, `BOX`, `OLT`, `truncated`) aparece na tela.
- Tipos seguem o backend (`npm run api:types`); o que faltar no backend o dono implementa, o front não contorna.
- Impacto é só leitura: não usa `NetworkMapState.canEdit`, não grava nada, não avisa ninguém.
- Specs de componentes pesados (Material ou Leaflet) usam `describe(..., { timeout: 20000 }, ...)`.
- Docs junto com cada tarefa: `docs/SPECS.md` (§2 e RI-37 em diante), `docs/GUIA.md`, `README.md`, `CLAUDE.md`.
- Sem Git: nada de add/commit/branch. No fim, listar os arquivos alterados e sugerir a mensagem de commit.
- Bash: heredoc com apóstrofo falha; usar a ferramenta Write ou script Python com `python -I`.

## Decisões de plano (fechadas aqui)

- **Ruling 1 — `target.coordinates`:** o design não listava, mas o mapa precisa. A resposta traz em `target.coordinates` o traçado do cabo (ou a posição da caixa ou da OLT). Custo se errado: o destaque do item some, sem quebrar o resto.
- **Ruling 2 — marcadores de impacto:** o `GeoMap` ganha o input `impactMarkers`, separado de `breakMarkers`, com cor por tipo (caixa, cliente, OLT). Não reaproveita `breakMarkers`, porque vermelho é quebra do rastreio. Custo se errado: retrabalho pequeno.
- **Ruling 3 — "Ver impacto" substitui o rastreio aberto e vice-versa:** uma ficha por vez, como no rastreio.
- **Ruling 4 — sem caixa ou cliente sem posição:** cliente sem posição fica só na lista; caixa sem posição fica só na lista.
- **Ruling 5 — sem spec da página do mapa:** o Leaflet não roda no jsdom. A ligação da página é verificada pelo build e no navegador; as regras puras têm testes próprios.

## Review Focus

1. Item sem clientes: a frase "Nenhum cliente depende deste item." aparece, não uma lista vazia — Task 2.
2. Resposta cortada (`truncated`): aviso "Mostrando os primeiros 2000 clientes; o total é N." — Task 2.
3. Resposta de um item anterior que chega depois de outro: descartada — Task 3.
4. Item inexistente (404): "Não encontramos este item na rede." — Task 3.
5. Cliente sem posição: continua na lista, não vira marcador — Task 4.
6. Caixa ou OLT sem posição e sem traçado: o mapa não quebra, a ficha segue — Task 4.

## Task 0: Contrato da API (dependência do backend)

**Pré-condição:** o dono implementa os três endpoints de impacto e roda `npm run api:types`.

**Files:**
- Create: `src/app/core/api/impact-types.ts`
- Test: `src/app/core/api/impact-types.spec.ts`

**Interfaces:**
- Produces: `ImpactKind` (`'cables' | 'boxes' | 'olts'`), `ImpactResponse`, `ImpactBox`, `ImpactCustomer`, `ImpactOlt`, `ImpactTarget` como apelidos de `components['schemas']` gerados.

- [ ] **Step 1: Confirmar o schema gerado.** Run: `npm run api:types`; procurar `/api/v1/impact` em `schema.d.ts`. Expected: três rotas. Se faltar, **parar** e avisar o dono.
- [ ] **Step 2: Teste de tipo** que importa os apelidos e atribui um exemplo (alvo com `coordinates`, caixa com um cliente, `truncated: true`). Falha antes do módulo existir.
- [ ] **Step 3: Criar `impact-types.ts`** com os apelidos (sem tipo escrito à mão).
- [ ] **Step 4: Rodar** `npx ng test --watch=false --include src/app/core/api/impact-types.spec.ts`. Expected: PASS.

## Task 1: Regras puras de texto e de marcadores

**Files:**
- Create: `src/app/core/network/impact-view.ts`, `src/app/core/network/impact-map.ts`
- Test: `src/app/core/network/impact-view.spec.ts`, `src/app/core/network/impact-map.spec.ts`

**Interfaces:**
- Consumes: `ImpactResponse`, `ImpactKind` (Task 0).
- Produces:
  - `summaryLine(response: ImpactResponse): string` — cabo: "Se este cabo sair, N clientes ficam sem sinal, em M caixas." (com "1 cliente", "1 caixa", "1 OLT" no singular); caixa e OLT: "Se esta caixa parar…" / "Se esta OLT parar…". Sem clientes: "Nenhum cliente depende deste item."
  - `totalsLine(totals): string` — "12 clientes · 3 caixas · 1 OLT".
  - `truncatedNote(response): string | null` — "Mostrando os primeiros 2000 clientes; o total é N." ou `null`.
  - `impactMarkers(response: ImpactResponse): ImpactMarker[]` — `{ key, kind: 'box' | 'customer' | 'olt', label, point: GeoPoint }`; cliente sem posição é omitido (Ruling 4); caixa ou OLT sem posição é omitida.
  - `impactTargetPath(response): GeoPath | null` — traçado do alvo quando é cabo (`target.coordinates` com dois pontos ou mais), `emphasis: true`, cor cinza neutra (a cor da fibra não vem na resposta).

- [ ] **Step 1: Testes** de `summaryLine` (cabo, caixa, OLT, zero clientes, singular), `totalsLine`, `truncatedNote` (com e sem corte), `impactMarkers` (cliente sem posição omitido; caixa sem posição omitida) e `impactTargetPath` (cabo com traçado e caixa sem traçado → `null`). Falham antes.
- [ ] **Step 2: Implementar** as funções com as frases literais acima.
- [ ] **Step 3: Rodar** os dois specs. Expected: PASS.

## Task 2: Cliente HTTP do impacto

**Files:**
- Create: `src/app/core/api/resources/impact-api.ts`
- Test: `src/app/core/api/resources/impact-api.spec.ts`

**Interfaces:**
- Consumes: `ImpactKind`, `ImpactResponse`.
- Produces: `ImpactApi.impact(kind: ImpactKind, id: string): Observable<ImpactResponse>` — `GET apiUrl(base, 'impact', kind, id)`.

- [ ] **Step 1: Teste** com `HttpTestingController`: URL `…/api/v1/impact/cables/<id>` e resposta entregue. Falha antes.
- [ ] **Step 2: Implementar** seguindo `trace-api.ts`.
- [ ] **Step 3: Rodar** o spec. Expected: PASS.

## Task 3: Store da consulta

**Files:**
- Create: `src/app/features/impact/impact-store.ts`
- Test: `src/app/features/impact/impact-store.spec.ts`

**Interfaces:**
- Consumes: `ImpactApi` (Task 2), `ImpactKind`.
- Produces: `@Injectable()` `ImpactStore` (provido pela página do mapa) com signals `query` (`{ kind, id } | null`), `state: 'idle' | 'loading' | 'ready' | 'error'`, `response`, `error`; métodos `open(kind, id)` e `close()`. Consulta nova cancela a anterior (Review Focus 3). 404 vira "Não encontramos este item na rede." (Review Focus 4); outro erro vira "Não foi possível calcular o impacto agora. Tente de novo.".

- [ ] **Step 1: Testes** com `ImpactApi` falso e `Subject`: (a) `open` vai a `loading` e depois `ready`; (b) a resposta de uma consulta antiga, chegando depois da nova, é descartada; (c) 404 dá a frase exata; (d) `close` zera o estado. Falham antes.
- [ ] **Step 2: Implementar** seguindo `trace-store.ts` (uma assinatura por vez, cancela a anterior).
- [ ] **Step 3: Rodar** o spec. Expected: PASS.

## Task 4: Ficha do impacto e marcadores no mapa

**Files:**
- Create: `src/app/features/impact/impact-sheet.ts`, `impact-sheet.html`, `impact-sheet.scss`
- Test: `src/app/features/impact/impact-sheet.spec.ts` (`describe(..., { timeout: 20000 }, ...)`)
- Modify: `src/app/shared/map/geo-map.ts` (input `impactMarkers`, desenho dos marcadores por tipo, sem arrastar)

**Interfaces:**
- Consumes: `ImpactStore` (Task 3), `summaryLine`, `totalsLine`, `truncatedNote` (Task 1), `ImpactMarker`.
- Produces:
  - `app-impact-sheet` com saída `closed` e saída `focusBox: string` (id da caixa). Mostra o título "Impacto de manutenção", a frase de resumo, a linha de totais, o aviso de corte, e a lista por caixa com os clientes (nome, "(sem nome)" quando vazio). Clicar numa caixa emite `focusBox`. Trata erro e vazio (Review Focus 1 e 2).
  - `GeoMap.impactMarkers: input<readonly ImpactMarker[]>([])`: círculos por tipo (caixa, cliente, OLT); cada um abre o nome ao ser tocado.

- [ ] **Step 1: Testes** da ficha: resumo e totais na tela; lista agrupada por caixa; "(sem nome)"; zero clientes mostra a frase; corte mostra o aviso; clicar numa caixa emite `focusBox` com o id; erro mostra a frase do store. Falham antes.
- [ ] **Step 2: Implementar** a ficha (OnPush, moldura `../network-map/sheet-frame.scss`) e o input no `GeoMap` seguindo o padrão do `breakMarkers` (um `L.layerGroup` próprio).
- [ ] **Step 3: Rodar** o spec da ficha e `npx ng build`. Expected: PASS e build ok.

## Task 5: Entradas e integração na página do mapa

**Files:**
- Modify: `src/app/features/network-map/cable-sheet/cable-sheet.ts/.html/.spec.ts`, `box-sheet/box-sheet.ts/.html/.spec.ts`, `olt-sheet/olt-sheet.ts/.html/.spec.ts` (botão "Ver impacto", data attribute `data-impact`, saída `impact`)
- Modify: `src/app/features/network-map/network-map-page.ts/.html` (provider `ImpactStore`, `openImpact(kind, id)`, ficha, `impactMarkers`, traçado do alvo, foco, fecha as outras fichas e o rastreio)

**Interfaces:**
- Consumes: `ImpactStore`, `impactMarkers`, `impactTargetPath`, `app-impact-sheet`.
- Produces: `openImpact(kind: ImpactKind, id: string)`: `state.select(null)`, fecha o rastreio, abre o impacto. Abrir rastreio fecha o impacto (o `traceSheetOpen` passa a exigir `!impact.query()`; o `impactSheetOpen` espelha o rastreio).
- Foco: `[traceFocus]` vira `!!trace.query() || !!impact.query()`.
- Enquadramento: quando a resposta chega, `viewport.focusAll` com os pontos do alvo (traçado ou posição), das caixas e dos clientes com posição.

- [ ] **Step 1: Testes** dos três botões (cada um emite `impact` com o id certo; o da OLT funciona mesmo sem clientes). Falham antes.
- [ ] **Step 2: Implementar** os botões e a integração na página. Sem spec de página (Ruling 5).
- [ ] **Step 3: Rodar** os três specs e `npx ng build`. Expected: PASS e build ok.

## Task 6: Documentação e suíte final

**Files:**
- Modify: `docs/SPECS.md` (§2.1 `ImpactApi`, §2.4.4 ou seção nova do impacto, RI-37), `docs/GUIA.md` (seção "Ver o impacto de uma manutenção"), `README.md` (linha da pasta `features/impact/`), `CLAUDE.md` (tabela, situação, decisões), este plano (estado), design (status).

- [ ] **Step 1: Atualizar as docs** acima.
- [ ] **Step 2: Suíte inteira:** `npx ng test --watch=false > <scratchpad>/suite-impacto.txt 2>&1`; conferir `Test Files`, `Tests  ` e `Unhandled` no arquivo. Expected: tudo passando, sem `Unhandled`.
- [ ] **Step 3: Build:** `npx ng build`. Expected: exit 0.
- [ ] **Step 4: Listar os arquivos alterados** e sugerir a mensagem: `feat: show customers that lose signal when a cable, box or OLT is down`.

## Pendências para o dono (fora do front)

- Endpoints `GET /api/v1/impact/{cables|boxes|olts}/{id}` conforme a especificação entregue, com `target.coordinates` (Ruling 1).
- Conferir no backend o limite de 2000 clientes e o agrupamento por caixa de atendimento.

## Self-Review

- **Cobertura do design:** endpoints (Task 0, dono), regras de texto e marcadores (Task 1), cliente HTTP (Task 2), store (Task 3), ficha e mapa (Task 4), entradas e página (Task 5), docs (Task 6). Sem lacunas.
- **Tipos:** `ImpactStore`, `ImpactApi.impact`, `summaryLine`, `impactMarkers`, `impactTargetPath`, `focusBox` usados com os mesmos nomes em todas as tarefas.
- **Revisão:** os seis itens de Review Focus têm teste na tarefa dona.

---

**Plan complete and saved to `docs/superpowers/plans/2026-11-20-impacto-manutencao.md`.** Please review the plan. Which execution approach would you prefer?

- **Subagent-driven**: um implementador novo por tarefa e um revisor antes da próxima.
- **Native**: eu implemento tudo nesta sessão e um revisor faz a revisão final do conjunto.

Recomendo **Native**, pelo mesmo motivo do rastreio: as tarefas dependem pouco umas das outras, e a Task 0 só começa quando o dono publicar os endpoints.
