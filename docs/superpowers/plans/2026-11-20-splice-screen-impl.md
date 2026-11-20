# Tela de fusões (Esquema Unifilar) — plano executado

> Executado em 2026-11-20 com superpowers:executing-plans (TDD em cada tarefa). Este plano substitui
> o esqueleto anterior de 4 tarefas, que não cobria o spec; os nomes de arquivo mudaram (ex.:
> `bandeja-grid` virou `tray-board`, `fiber-selector` virou `splice-picker`).

**Spec:** `docs/superpowers/specs/2026-11-20-tela-de-fusoes-design.md`

**Objetivo:** rota `/caixas/:boxId/fusoes` com a bandeja desenhada como a física (todas as
posições), emenda registrada com dois toques em fibras coloridas numa posição exata, consulta da
emenda, cabos "abertos" e volta ao mapa com a caixa selecionada.

## Restrições globais

- Sem `git add/commit`: o dono faz os commits (mensagens sugeridas em cada tarefa).
- Reaproveitar `BoxSheetStore` (provido pela página nova); nada novo no repositório do mapa.
- TDD: teste → RED → código → GREEN; suíte inteira e build no fim.
- Textos pt-BR simples; nenhum código do backend na tela; pontas A/B só no modo avançado.
- Responsivo: painel à direita (≥ 900px) ou por cima da parte de baixo (< 900px).

## Tarefas

- [x] **1. Regras puras** — `core/network/splice-board.ts` + spec: `usedEnd`, `trayPositions`,
  `unplacedSplices`, `describeTraySummary`, `fiberPick` (livre ou motivo), `fiberLocation`,
  `fiberShortName`, `attachmentText`, `pickHint`, `cableTubes`, `defaultSpliceCables`.
  Commit: `feat: add splice board rules (positions, used end, fiber availability)`
- [x] **2. Erros de posição** — `error-messages.ts`: "Position N is already occupied in this tray"
  e "Position N exceeds tray capacity of M". Commit: `feat: translate splice position errors`
- [x] **3. Store** — `BoxSheetStore.saveSplice(body, done)` (erro traduzido para o painel; recarrega
  sem apagar a tela); `addSplice` removido. Commit: `feat: save splice at exact position from store`
- [x] **4. Volta ao mapa** — `core/services/map-return.ts` + spec; a página do mapa aplica o recado
  quando a rede carrega e navega para a tela de fusões (`openSplices`).
  Commit: `feat: return from other screens to the map with a selection`
- [x] **5. Ficha da caixa** — seção de fusões vira resumo ("5 fusões em 2 bandejas") + "Ver fusões"
  (também no Resumo, inclusive CTO sem bandeja); lista, "Nova fusão" e bandejas saem da ficha.
  Commit: `feat: box sheet links to the splice screen`
- [x] **6. Bandeja** — `features/box-splices/tray-board` + spec. Commit: `feat: add tray board`
- [x] **7. Escolha de fibras** — `splice-picker` + spec. Commit: `feat: add splice fiber picker`
- [x] **8. Consulta** — `splice-detail` + spec. Commit: `feat: add splice detail card`
- [x] **9. Cabos** — `cable-strip` + spec. Commit: `feat: add cable strip to splice screen`
- [x] **10. Página e rota** — `box-splices-page` + spec; rota lazy `caixas/:boxId/fusoes`, título
  "GeoFiber — Fusões". Fixture de teste em `src/testing/box-splices-fixtures.ts`.
  Commit: `feat: add splice screen route and page`
- [x] **11. Documentação** — SPECS (§1.1, §2.2, §2.4, §2.4.1, RI-32, RI-33), GUIA ("Registrar
  fusões"), README, CLAUDE.md. Commit: `docs: document the splice screen`
- [ ] **12. Conferência no navegador** (dono): celular e computador, tema claro e escuro, link
  direto, voltar ao mapa (mesma posição/zoom, caixa selecionada), emendar, erro 409 no painel,
  fibra apagada explicando o motivo, cabo sem fibras, bandeja vazia e "Sem posição definida".

## Resultado

Suíte: 63 arquivos / 352 testes passando; `npx ng build` ok.
