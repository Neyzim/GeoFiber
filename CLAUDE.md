# GeoFiber — frontend

Documentação de rede FTTH sobre um mapa. Dois públicos: o **técnico** que documenta a rede e a
**pessoa leiga** que navega por ela. Backend: `C:\Users\Admin\Documents\geofiber-backend`
(Spring, `/api/v1`, erros em ProblemDetail, coordenadas `{longitude, latitude}`).

## Regras de trabalho (do dono do projeto)

- **Sem Git.** Nada de `add`, `commit`, `branch`, `checkout`, `stash` ou worktree; `git status` e
  `git diff` (só leitura) podem. No fim de cada tarefa: listar os arquivos alterados e sugerir a
  mensagem de commit — o dono faz os commits.
- **Documentação junto com o código.** Toda implementação atualiza `docs/SPECS.md`, `docs/GUIA.md`,
  `README.md` e tem design + plano em `docs/superpowers/specs|plans/`. Etapa sem doc não está pronta.
- **TDD:** escrever o teste, ver falhar, implementar, ver passar; rodar a suíte inteira no fim.
- Tipos, situações e enums **seguem o backend**. Se faltar algo no backend, avisar o dono (ele
  implementa lá); não contornar no front.
- Textos de tela em **pt-BR simples**; nenhum código do backend (`START`, `RATIO_1_8`…) aparece na
  tela; pontas A/B só em modo avançado.
- Autenticação virá depois: edição passa por `NetworkMapState.canEdit` (hoje sempre `true`).

## Comandos

- `npm start` — servidor de desenvolvimento.
- `npx ng build` — build (precisa passar).
- `npx ng test --watch=false` — suíte inteira (Vitest). Um arquivo:
  `npx ng test --watch=false --include caminho/arquivo.spec.ts` (vários `--include` permitidos; use
  globs `*.spec.ts`, não `**`). O builder compila tudo o que os specs alcançam, então um erro de tipo
  em qualquer lugar quebra o teste.
- `npm run api:types` — regenera `src/app/core/api/generated/schema.d.ts` a partir do backend
  rodando em `localhost:8080`; os apelidos ficam em `src/app/core/api/api-types.ts`.
- Ao ler a saída de teste, procurar também **"Unhandled"** (erros soltos não aparecem no resumo).
- No Bash deste ambiente, heredocs com apóstrofo falham: para edições grandes, escrever um script
  Python no scratchpad e rodar com `python -I script.py "$(pwd)"`.

## Stack

Angular 22 (standalone, signals, zoneless, OnPush), Angular Material, Leaflet 1.9 +
leaflet.markercluster (CommonJS liberado no `angular.json`), Vitest via `ng test`, TypeScript 6.

## Onde está cada coisa

| Caminho | O quê |
|---|---|
| `src/app/core/api/` | Cliente HTTP por recurso (`resources/*-api.ts`), tipos gerados, tradução de erros (`error-messages.ts`). |
| `src/app/core/network/` | Regras puras e estado do mapa: `network-catalog` (grupos, funções, situações, estilo das linhas), `map-element`, `network-map-repository` (único ponto que fala com a API para o mapa), `network-map-state` (seleção, busca, filtros), `optical-catalog`, `cable-route`, `box-interior`, `olt-ports`, `customer-rules`, `glossary`, `view-summary`. |
| `src/app/features/network-map/` | Página do mapa e as fichas laterais: `cable-sheet/`, `box-sheet/` (com `fiber-link-dialog`), `olt-sheet/`, `customer-sheet/`; `sheet-support.ts`. |
| `src/app/features/box-splices/` | Tela de fusões `/caixas/:boxId/fusoes`: `box-splices-page`, `cable-strip`, `tray-board`, `splice-picker`, `splice-detail`. Regras em `core/network/splice-board.ts`; volta ao mapa por `core/services/map-return.ts`. |
| `src/app/shared/map/` | `geo-map` (Leaflet), marcadores, barra de ferramentas, legenda, barra de status. |
| `src/app/shared/network/` | Formulários de OLT, caixa e cliente (`form-support.ts` compartilhado). |
| `src/app/shared/cable/` | Formulário do cabo. |
| `src/app/shared/help/` | Glossário, "?" nos termos, "O que estou vendo?". |
| `src/app/shared/common/` | `app-fiber-dot` (bolinha ABNT), `app-occupancy-badge` ("3/12"), `app-sheet-tabs`. |
| `src/app/shared/diagram/` | `app-unifilar-summary` (linha do topo da ficha), `app-diagram-line` (uma emenda). |
| `src/theme/_tokens.scss` | Tokens `--gf-*` (cores `light-dark()`, raios, sombra, fontes) e ponte para `--mat-sys-*`. Nunca `prefers-color-scheme` em estilo. |
| `features/network-map/sheet-frame.scss` | Moldura comum das fichas (topo fixo, corpo rola, 400px / gaveta 60dvh < 900px). |
| `core/network/{unifilar,occupancy,line-state-style}.ts` | Lados da linha do topo, contas de ocupação, forma da linha por estado. |
| `docs/SPECS.md` | Especificação técnica: módulos (§2) e regras de interface RI-01…RI-25 (§3). |
| `docs/GUIA.md` | Guia de uso para quem opera o sistema. |
| `docs/superpowers/` | Roadmap, designs e planos por etapa. |

## Padrões do código

- Escritas de criar/editar/excluir são **pessimistas** (atualizam a tela após sucesso); arrastar no
  mapa é **otimista** com rollback.
- `MapElement.key` = `olt:id`, `box:id` ou `customer:id`. Grupos visuais: `olt`, `CTO`, `CEO`, `DIO`,
  `customer`.
- Fichas: um store por ficha (`CableSheetStore`, `BoxSheetStore`, `OltSheetStore`) provido pela
  página; `open(id)` / `close()` seguem a seleção; respostas de um item que já foi fechado são
  ignoradas; escritas recarregam a ficha. Só uma ficha aparece por vez.
- Diálogos de formulário salvam sozinhos e fecham com o resultado; enquanto salvam, não fecham
  (`disableClose`). Exclusões sempre pedem confirmação.
- Specs de componentes pesados (Material) usam `describe(..., { timeout: 20000 }, ...)`.
- Mocks de `NotificationService.apiError` devem retornar `parseApiError(error)`.

## Regras do backend que o front respeita

- Porta 1 do splitter é a entrada; saídas = portas 2..N+1 (na tela, saídas 1..N). Splitter em CTO
  cria portas de atendimento automaticamente. Só CTO tem portas de atendimento.
- Pontas padrão: porta PON A; splitter entrada B / saídas A; porta de atendimento B; fusão entrada
  B / saída A; conector exige as duas pontas.
- `PUT` de porta do splitter substitui a atenuação → reenviar a atual. Sem `fiberId` = desliga.
- Fibra só vira rompida/reservada se estiver livre; "ocupada" é automático.
- Estrutura do cabo (`POST /cables/{id}/structure`): soma das capacidades dos tubos ≤ fibras do cabo.
- Cliente cancelado não envia `servicePortId` (o backend libera a porta). Porta do cliente precisa
  estar livre e ter origem de sinal. Código de contrato é único.
- OLT: placa + porta é única por OLT.

## Situação (2026-11-20)

Roadmap em `docs/superpowers/specs/2026-11-19-frontend-roadmap-design.md`. Decisões fixas: escala
"A" agora (canvas + cluster), "B" (busca por área + cache) quando o backend tiver; **rastreio de
fibra adiado**; modelos de rede são atalhos locais.

**Visual "Esquema Unifilar":** executado pelo plano
`docs/superpowers/plans/2026-11-20-redesign-unifilar-app.md` (Tasks 1–14; design em
`docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md`, RI-26…RI-31 no SPECS). O plano
antigo `2026-11-20-visual-redesign-unifilar.md` foi substituído (commits dele: `77906cb`, `2407fab`,
`c6b62c9`, `93a955b`, `156a534`). O trabalho do plano novo **não foi commitado**: as mensagens
sugeridas por tarefa estão nos passos "Registrar" do plano. Tokens `--gf-*` em `src/theme/`, tema pela
classe `html.dark-theme`, fichas com linha "chega → elemento → sai" + abas, diagrama por emenda,
ocupação "ocupado/total", foco no mapa. O tema escuro muda só a interface: o mapa fica em ruas
(OpenStreetMap) ou satélite; as camadas do CARTO saíram porque passaram a exigir chave.

- **Etapa 0–1:** fundação e mapa ligado à API ✅ (OLTs, caixas, clientes, cabos; criar, editar, mover,
  excluir; legenda, busca, filtros, tema escuro).
- **Etapa 2:** ficha do cabo ✅ (lista de elementos editável, destaque no mapa, tubos e fibras).
- **Etapa 3:** ficha da caixa ✅ (bandejas, fusões, conectores, splitters, portas de atendimento).
  - **Tela de fusões** ✅ `/caixas/:boxId/fusoes` (plano `docs/superpowers/plans/2026-11-20-splice-screen-impl.md`,
    design `2026-11-20-tela-de-fusoes-design.md`, RI-32/33). Não commitada; falta conferir no navegador.
- **Etapa 4:** ficha da OLT (portas PON por placa, criação em lote, ligar fibra).
- **Etapa 5:** clientes (cadastro pelo mapa, CTO mais próxima, porta livre com sinal, situação,
  histórico).
- **Etapa 6:** ajuda para leigos (glossário, "?" nos termos, "O que estou vendo?").

Testes: 63 arquivos / 352 passando; build ok. Falta a conferência no navegador (ver Pendências).

### Decisões tomadas sem o dono (revisar se algo incomodar)

- Erro do servidor ao salvar a lista do cabo mantém o rascunho aberto.
- Um único diálogo de fibras serve fusão, conector, splitter e porta; sempre envia a ponta explícita.
- Posição do cliente vem do clique no mapa e não é editável no formulário.
- O balão do cabo usa a lista carregada pela ficha (uma requisição só).
- Unifilar: painel lateral de 400px no computador; gaveta embaixo só no celular.
- Unifilar: gaveta do celular com 60dvh (não 240–280px), para caber topo + abas + conteúdo.
- Unifilar: destaque verde mais escuro (`#177a54`) para botões/aba ativa no claro; `#1f9d6b` fica como situação "normal".
- Unifilar: duas cores novas de situação, `info` (azul, instalado/ocupado) e `inactive` (cinza).
- Unifilar: fontes IBM Plex Sans + IBM Plex Mono.
- Unifilar: traços distintos para planejado, reservado, desativado e rompido.
- Unifilar: situação numa linha abaixo do nome; "Editar dados" vira botão de ícone no cabeçalho.
- Fusões: fibra de cabo que passa pela caixa, no "abrir cabo", mostra a ponta B (chega) e, se livre, a A.
- Fusões: o nome curto da emenda é "CABO-01 Verde·2" = cabo, cor do tubo, número da fibra no tubo.
- Fusões: a consulta usa o nome completo já existente ("CABO-01, tubo 1 (Verde), fibra 2 (Amarelo)").
- Fusões: "Abrir ficha do cabo" (cabo sem fibras) volta ao mapa com o cabo selecionado.
- Fusões: "+ bandeja" mostra as capacidades em botões (6/12/24/36/48), sem menu.
- Mapa: barra de ferramentas em coluna fina (40px, botões de 34px) e painel lateral expandido com 232px (RI-34).
- Mapa: listras com zoom do navegador ≠ 100% vinham do `plus-lighter` do Leaflet 1.9.4; `styles.scss` usa blocos de 257px com mistura normal (conferido em 50%, 67%, 100% e 125%).
- Mapa: ajuda no canto inferior esquerdo; a escala do Leaflet foi para o canto inferior direito; escolha de tipo vira popup de 216px ao lado da barra.
- Unifilar: `.impecable.md` não foi renomeado nem apagado (regras consolidadas no spec e no `DESIGN.md`).

### Pendências conhecidas (menores)

- **Validar no navegador a tela de fusões** (celular e computador, claro e escuro, link direto,
  voltar ao mapa, emendar, erro 409 no painel).

- **Validar no navegador o redesign Unifilar** (lista no Task 14, Step 5 do plano
  `2026-11-20-redesign-unifilar-app.md`) até o dono conferir.

- Clicar em outro cabo durante "Escolher no mapa" descarta o rascunho.
- Trocar a ponta (modo avançado) não limpa a fibra escolhida que deixou de estar livre.
- Mudar o tipo da caixa em "Editar dados" só atualiza a ficha ao selecionar de novo.
- Criação de portas PON em lote sem progresso por porta.
- Legenda não edita/exclui clientes (isso é feito na ficha do cliente).
- Rollback de arrasto compara só a posição; arrastos do mesmo elemento podem chegar fora de ordem.
- Duplo clique pode adicionar um vértice quase duplicado no traçado do cabo.
- Modelos "CEO 24 emendas" migrados não têm `trayCapacity`.
- Reclicar o cabo selecionado em "Mover cabo" busca as pontas de novo.
- Não verificado no navegador: posição das fichas à direita junto do painel de camadas, tema
  claro/escuro das fichas.
