# GeoFiber Frontend — Especificação

Especificação funcional do frontend. Define **o que** a interface faz e **quais regras** segue. O
plano de evolução está no [roadmap](superpowers/specs/2026-11-19-frontend-roadmap-design.md); o
uso no dia a dia, no [guia](GUIA.md).

- **Status:** Etapas 1 a 6 do roadmap concluídas (validação no navegador pendente).
- **Stack:** Angular 22 (standalone, signals, zoneless), Angular Material, Leaflet, Vitest.
- **Backend:** GeoFiber Fase 1 (`/api/v1`, OpenAPI em `/v3/api-docs`). O backend é a fonte da
  verdade de toda a rede.

Convenção: **RI** = regra de interface.

---

## 1. Escopo

### 1.1 Já entregue
- **Etapa 0:** camada de comunicação com o backend (`src/app/core/api`): configuração, idioma,
  tipos gerados, conversão de coordenadas, tradução de erros e um serviço por recurso.
- **Etapa 1:** o mapa lê e grava no backend. Mostra OLTs, caixas (CTO, CEO, DIO), clientes e
  cabos; cria, edita, move e exclui OLTs, caixas e cabos; agrupa marcadores próximos; desenha os
  cabos com cor pela função e tracejado pela situação; mostra o início e o fim do cabo selecionado.
- **Etapa 2:** ficha do cabo ao selecioná-lo: frase simples de onde ele sai e aonde chega, lista
  de elementos editável (por seletor ou clicando no mapa), destaque das caixas/OLTs do cabo no mapa,
  criação de tubos e fibras de uma vez e situação de cada fibra.
- **Etapa 3:** ficha da caixa ao selecioná-la: resumo simples, cabos da caixa, bandejas e fusões,
  conectores, splitters (entrada e saídas) e portas de atendimento com a origem do sinal e o cliente.
- **Etapa 4:** ficha da OLT ao selecioná-la: resumo, cabos que saem dela e portas PON por placa
  (criação em lote, ligar/desligar fibra, situação manual, exclusão).
- **Etapa 5:** cadastro de clientes pelo mapa ("Adicionar elemento" → Cliente), escolha de CTO
  (mais próximas primeiro) e de porta livre com sinal, ficha do cliente com situação explicada,
  quem o atende, mudança rápida de situação e histórico.
- **Etapa 6:** ajuda para leigos: "O que estou vendo?", glossário pesquisável e "?" nos termos
  técnicos das fichas.
- Camadas base, legenda com busca e filtros, tema claro/escuro.
- Cadastro de modelos (atalhos de preenchimento de CTO, CEO e cabo) no navegador.
- **Visual "Esquema Unifilar"** ([design](superpowers/specs/2026-11-20-redesign-unifilar-app-design.md),
  [plano](superpowers/plans/2026-11-20-redesign-unifilar-app.md)): tokens `--gf-*` com tema
  claro/escuro, fichas com a linha "chega → elemento → sai" e abas, diagrama por emenda, bolinhas de
  fibra ABNT, ocupação "ocupado/total" e foco no mapa. O tema escuro muda só a interface; o mapa
  fica em ruas (OpenStreetMap) ou satélite.
- **Diagrama de fusões** (`/caixas/:boxId/fusoes`; [design](superpowers/specs/2026-11-20-diagrama-de-fusoes-design.md),
  [plano](superpowers/plans/2026-11-21-diagrama-de-fusoes.md); etapa 1): uma aba por cabo (e uma de
  splitters) com o destino de cada fibra em frase curta; tocar numa fibra abre a gaveta com o
  desenho daquela ligação; emenda por dois toques, com a bandeja escolhida ou criada sozinha.
  Substituiu a tela de bandejas ([design antigo](superpowers/specs/2026-11-20-tela-de-fusoes-design.md)).
  Etapa 2 (desenho clássico no computador) ainda não feita.
- **Gerenciar usuários** (`/usuarios`, só administrador; [design](superpowers/specs/2026-11-21-gerenciar-usuarios-design.md),
  [plano](superpowers/plans/2026-11-21-gerenciar-usuarios.md); segurança etapa 2): lista de contas,
  desativar quem saiu, reativar, trocar senha esquecida e cadastrar (RI-39).
- **Importação de KMZ/KML** (`/importar`; [design](superpowers/specs/2026-11-20-importar-kmz-design.md),
  [plano](superpowers/plans/2026-11-20-importar-kmz.md)): lê o arquivo no navegador, agrupa os itens
  (pontos por pasta e ícone; linhas por pasta, cor e espessura), a pessoa decide o tipo de cada
  grupo ou item, reconhece o que já existe (sem duplicar), mostra a prévia no mapa e grava tudo de
  uma vez. Depende do endpoint `POST /imports/network` no backend.

### 1.2 Ainda não entregue
- Nome de quem entrou no cabeçalho (depende de `GET /auth/me`). Mudar papel ou excluir conta (sem
  endpoint). Esconder editar/excluir de quem não é dono (depende de `createdBy` ou `ownedByMe` nas
  respostas).
- Rastreio do sinal de ponta a ponta (adiado no roadmap) e escala B (listas paginadas).
- Busca por área e cache (Etapa B). Rastreio de fibra (futuro).
- Exportar KMZ/KML e importar clientes pelo arquivo (o cliente exige contrato e porta).

---

## 2. Arquitetura da camada de API

### 2.0 Sessão e acesso (`core/auth`, `features/auth`; [design](superpowers/specs/2026-11-21-seguranca-frontend-design.md), [plano](superpowers/plans/2026-11-21-seguranca-frontend.md))

| Arquivo | Responsabilidade |
|---|---|
| `core/auth/auth-api.ts` | `POST /auth/login`, `/auth/refresh`, `/auth/logout` (refresh e logout sem corpo). |
| `core/auth/auth-session.ts` | Sessão: `status` (`checking`/`offline`/`signedIn`/`signedOut`), token só em memória, papel lido do JWT, `start()` (refresh ao abrir, uma vez), `login`, `refresh()` único em andamento, renovação em `expiresIn − 60` s (mín. 10 s; sem conexão, de novo em 30 s), `logout()` (limpa mesmo com erro) e `expire()` (login com `?expirou=1&voltar=`). |
| `core/auth/auth.interceptor.ts` | Só na API: `withCredentials` sempre; Bearer fora de `/auth/*`; 401 → espera o refresh da sessão e repete uma vez; repetição com 401 → `expire()`; refresh sem conexão → o erro de conexão segue para quem chamou. |
| `core/auth/auth-guards.ts` | `authGuard` (todas as telas da rede), `guestGuard` (`/entrar`), `adminGuard` (`/usuarios`; quem não é administrador vai ao mapa; vem depois do `authGuard`) e `safeReturnUrl` (só caminho interno). |
| `core/auth/jwt.ts`, `roles.ts` | `readTokenClaims` (id e papel, nunca lança) e `roleText` ("Administrador", "Técnico"). |
| `core/api/resources/user-api.ts` | `GET /users` (lista por nome), `POST /users` (cadastro), `PATCH /users/{id}/active` (`{active}`) e `PUT /users/{id}/password` (`{password}`), só administrador. |
| `features/auth/sign-in-page.ts` | Página `/entrar`: e-mail e senha, aviso de sessão expirada, erros em português, aviso de conexão com "Tentar novamente". |
| `shared/users/user-form-dialog.ts` | Diálogo "Cadastrar usuário": nome, e-mail, senha (≥ 10), papel; 409 no campo e-mail, 400 de senha no campo senha. |
| `shared/users/password-dialog.ts` | Diálogo "Trocar senha de <nome>": senha nova (≥ 10, mostrar/ocultar); 400 no campo; sucesso "Senha de <nome> trocada. Passe a nova senha para ela." Na própria conta avisa antes, mostra "Sua senha foi trocada. Entre de novo com a senha nova." e sai (o backend encerra as sessões). |
| `features/users/users-store.ts` | Lista da página: `load()`, `setActive(user, active)` (uma troca por vez em `busyId`; sucesso avisa "Conta de <nome> desativada/reativada." e recarrega; erro só avisa). |
| `features/users/users-page.ts` | Página `/usuarios`: lista (nome, e-mail, papel · situação), "(você)" na própria linha, Trocar senha, Desativar (com confirmação) / Reativar, Cadastrar. |
| `shared/map/map-toolbar` | Botão "Conta" no pé da barra: papel e "Sair". |
| `features/network-map/network-sidebar` | Painel lateral: Modelos de rede, Importar KMZ/KML (quem edita) e Usuários (só administrador, abre `/usuarios`). |

| Arquivo | Responsabilidade |
|---|---|
| `environments/environment.ts` | `apiBaseUrl` (padrão `http://localhost:8080/api/v1`). |
| `core/api/api-config.ts` | Token `API_BASE_URL` e `apiUrl(base, ...segmentos)`, que codifica cada segmento. |
| `core/api/accept-language.interceptor.ts` | Envia `Accept-Language: pt-BR` nas chamadas à API. |
| `core/api/generated/schema.d.ts` | Tipos gerados do OpenAPI (`npm run api:types`). |
| `core/api/api-types.ts` | Aliases dos schemas e dos enums do backend. |
| `core/api/coordinates.ts` | Conversão `{longitude, latitude}` ↔ `{lat, lng}`. |
| `core/api/api-error.ts` / `error-messages.ts` | ProblemDetail → `ApiError` com mensagem em português. |
| `core/api/form-errors.ts` | Aplica os erros por campo do backend num `FormGroup`. |
| `core/api/resources/*.ts` | Um serviço Angular por recurso (tabela abaixo). |

### 2.1 Serviços e endpoints

Todos os caminhos são relativos a `/api/v1`.

| Serviço | Endpoints |
|---|---|
| `OltApi` | `GET/POST /olts`, `GET/PUT/DELETE /olts/{id}`, `GET /olts/{oltId}/cables`, `GET/POST /olts/{oltId}/ports`, `PUT/DELETE /olts/{oltId}/ports/{portId}` |
| `BoxApi` | `GET/POST /boxes`, `GET/PUT/DELETE /boxes/{id}`, `GET /boxes/{boxId}/cables`, `GET /boxes/{boxId}/overview` |
| `CableApi` | `GET/POST /cables`, `GET/PUT/DELETE /cables/{id}`, `GET/POST /cables/{cableId}/tubes`, `PUT/DELETE /cables/{cableId}/tubes/{tubeId}`, `GET/PUT /cables/{cableId}/attachments`, `POST /cables/{cableId}/structure`, `GET /cables/{cableId}/fibers` |
| `FiberApi` | `GET/POST /tubes/{tubeId}/fibers`, `PUT/DELETE /tubes/{tubeId}/fibers/{fiberId}`, `PUT /tubes/{tubeId}/fibers/{fiberId}/status` |
| `TrayApi` | `GET/POST /boxes/{boxId}/trays`, `PUT/DELETE /boxes/{boxId}/trays/{trayId}` |
| `SpliceApi` | `GET/POST /boxes/{boxId}/splices`, `DELETE /boxes/{boxId}/splices/{spliceId}` |
| `ImportApi` | `POST /imports/network` (importação de KMZ/KML: lista pronta, gravada numa transação) |
| `TraceApi` | `GET /trace/{kind}/{id}?direction=` (rastreio da fibra: só leitura, o backend calcula o caminho) |
| `ImpactApi` | `GET /impact/{cables|boxes|olts}/{id}` (impacto de manutenção: clientes, caixas e OLTs que ficam sem sinal; só leitura) |
| `SplitterApi` | `GET/POST /boxes/{boxId}/splitters`, `PUT/DELETE /boxes/{boxId}/splitters/{splitterId}`, `PUT /splitters/{splitterId}/ports/{portId}` |
| `ServicePortApi` | `GET/POST /boxes/{boxId}/service-ports`, `PUT/DELETE /boxes/{boxId}/service-ports/{portId}` |
| `ConnectionApi` | `GET/POST /boxes/{boxId}/connections`, `DELETE /boxes/{boxId}/connections/{connectionId}` |
| `CustomerApi` | `GET/POST /customers`, `GET/PUT/DELETE /customers/{id}`, `GET /customers/{id}/history` |

### 2.2 Camada do mapa (`core/network`)

| Arquivo | Responsabilidade |
|---|---|
| `network-catalog.ts` | Catálogo visual: grupos de elemento (OLT, CTO, CEO, DIO, cliente), funções de cabo, situações, cores e `cableLineStyle(função, situação)`. |
| `map-element.ts` | Converte as respostas da API em `MapElement` (marcador) e `MapCable` (linha); itens sem localização ou com menos de 2 pontos ficam fora do mapa. |
| `network-map-repository.ts` | Único ponto em que o mapa fala com a API: carrega as 4 listas e aplica as escritas. |
| `network-map-state.ts` | Estado da tela: `canEdit`, seleção, busca, filtro de situação, grupos ocultos e as listas filtradas/visíveis. |
| `legend-sections.ts` | Monta a árvore da legenda ("Elementos" por tipo, "Cabos" por função). |
| `line-state-style.ts` | Forma da linha por estado (`active`, `planned`, `reserved`, `disabled`, `broken`): `lineStateOf` (situação de infra/cliente), `fiberLineState` e `lineStyleByState` (`stroke-dasharray`). |
| `unifilar.ts` | Lados da linha do topo das fichas: `boxSides`, `cableSides`, `oltSides`, `customerSides`; `splitVisible` mostra até 3 de cada lado e o "+N". |
| `occupancy.ts` | Contas de ocupação: portas de atendimento, saídas de splitter, portas PON e fibras do tubo. |
| `splice-board.ts` | Regras da emenda: `usedEnd` (ponta pelo papel do cabo), `fiberPick` (livre ou o motivo), `attachmentText`, `defaultSpliceCables`, `describeTraySummary`. |
| `fiber-destinations.ts` | Diagrama de fusões: `boxFiberMap` (cabos na ordem chega → passa → sai, tubos com ocupação, cada fibra com o destino em frase: "→ CABO · Verde 1", "→ Splitter 1:8", "→ porta 3 · Maria", "livre"…) e `boxSplitters` (entrada e saídas). |
| `splice-plan.ts` | `trayForNewSplice` (primeira bandeja com espaço, senão criar a próxima com 12 posições, ou caixa cheia pelo `trayCapacity`), `spliceSides` (quem é entrada: chega antes de passa antes de sai; pontas explícitas) e `trayChoiceText`. |

Os formulários ficam em `shared/network/` (OLT e caixa) e `shared/cable/` (cabo); cada um salva
pelo repositório e só fecha depois da resposta do servidor. O início e o fim do cabo selecionado
são descritos por `features/network-map/cable-ends.ts`.

| Função do cabo | Cor | Espessura |
|---|---|---|
| Backbone | azul-escuro `#3949ab` | 6 |
| Alimentação | vermelho `#e53935` | 5 |
| Distribuição | verde-azulado `#00897b` | 4 |
| Drop | amarelo `#f9a825` | 3 |
| Interconexão | marrom `#6d4c41` | 4 |

| Situação | Linha |
|---|---|
| Planejado | tracejada (`10 8`) |
| Instalado / Ativo | contínua |
| Danificado | vermelha `#d23c3c`, pontilhada (`4 6`) |
| Desativado | cinza `#8a96a3`, opacidade 0,5 |

As linhas do mapa são desenhadas em canvas e não leem variáveis CSS, por isso usam hex fixo. As
linhas das fichas (topo e diagramas) usam a forma de `line-state-style.ts` (RI-29).

### 2.2.1 Visual e peças comuns (Esquema Unifilar)

| Arquivo | Responsabilidade |
|---|---|
| `src/theme/_tokens.scss` | Fonte única dos tokens `--gf-*` (cores com `light-dark()`, situação, tinta das fibras, raios, sombra, fontes, toque 44px) e ponte para os `--mat-sys-*` do Material. |
| `shared/common/fiber-dot.ts` | `app-fiber-dot`: bolinha ABNT com borda, número com tinta legível, `aria-label` e `title` ("Fibra 3 · Branco"). |
| `shared/common/occupancy-badge.component.ts` | `app-occupancy-badge`: "ocupado/total unidade" em `.gf-data`; não aparece com total 0. |
| `shared/common/sheet-tabs.ts` | `app-sheet-tabs`: abas das fichas com sublinhado de 2px. |
| `shared/diagram/unifilar-summary.ts` | `app-unifilar-summary`: linha "chega → elemento → sai" do topo da ficha, com a forma pela situação. |
| `shared/diagram/diagram-line.component.ts` | `app-diagram-line`: uma linha por fusão/conector (entrada ─ posição/atenuação ─ saída) com `aria-label` da frase completa. |
| `features/network-map/sheet-frame.scss` | Moldura comum das fichas: topo fixo, corpo rolável, 400px no computador, gaveta arrastável no celular (< 900px; altura `--gf-sheet-height`, 35dvh ao abrir). |
| `core/network/sheet-drag.ts` | Gaveta do celular: `SHEET_OPEN` 0,35, `SHEET_MAX` 0,9, `SHEET_DISMISS` 0,2; `dragHeight` e `dragEnd` (RI-40). |
| `shared/common/sheet-drag.directive.ts` | `appSheetDrag`: alça `[data-sheet-grip]` muda a altura da ficha no celular; soltar abaixo de 20% emite `sheetDismiss` (a ficha fecha). |
| `shared/map/create-banner.ts` | `app-create-banner`: faixa "Criar CTO" no topo do mapa depois de escolher o tipo; tocar reabre a escolha, X encerra a criação. |
| `core/services/map-viewport.ts` | `focus(point, zoom, bottomInset)` e `focusAll(points, maxZoom, bottomInset)`: no celular o centro desce metade da gaveta para o item ficar à vista. |
| `shared/map/map-focus.ts` | Foco no mapa: classe `gf-map--focus` e `pathOpacity` (cabos não selecionados a 0,35). |
| `core/services/map-preferences.ts` | Camada base salva; uma chave que não existe mais (CARTO "Claro"/"Escuro") volta para ruas. |

### 2.3 Ficha do cabo (`features/network-map/cable-sheet`)

| Arquivo | Responsabilidade |
|---|---|
| `core/network/optical-catalog.ts` | Cores ABNT (ordem, nome, amostra), situações de fibra e porta, rótulos de ligação, `planStructure` e `structurePreview`. |
| `core/network/cable-route.ts` | Lista de elementos ↔ itens editáveis: papéis pela posição, validação e a frase "Este cabo sai de…". |
| `cable-sheet-store.ts` | Estado da ficha aberta (provido pela página): lista, rascunho, modo "escolher no mapa", tubos e fibras. |
| `cable-sheet.ts` | Painel à direita do mapa. |

### 2.4 Ficha da caixa (`features/network-map/box-sheet`)

| Arquivo | Responsabilidade |
|---|---|
| `core/network/box-interior.ts` | Nome da fibra para leigos, fibras com ponta livre, pontas padrão, splitters (razões, saídas a partir de 1), origem do sinal da porta e o resumo da caixa. |
| `box-sheet-store.ts` | Estado da caixa aberta (ficha e tela de fusões): `GET /boxes/{id}/overview` + fibras de cada cabo; escritas de bandeja, fusão, conector, splitter e porta (sempre recarrega, sem apagar a tela). `spliceFibers(choice, sides, done)` cria a bandeja quando preciso e a fusão sem posição; devolve o id ou o erro traduzido para a gaveta. |
| `fiber-link-dialog.ts` | Diálogo único para escolher fibras (conector, splitter, porta); pontas A/B no modo avançado. |
| `box-sheet.ts` | Painel à direita do mapa; seções conforme o tipo (CTO: splitters e portas; CEO/DIO: fusões, conectores e splitters). Fusões: só o resumo e "Ver fusões" (também no Resumo). |

### 2.4.1 Diagrama de fusões (`features/box-splices`)

| Arquivo | Responsabilidade |
|---|---|
| `box-splices-page.ts` | Página da rota `caixas/:boxId/fusoes` (provê o `BoxSheetStore`): cabeçalho com voltar, seleção (fibra, splitter ou emenda, pelo id), modo escolher com aviso e Cancelar, fibras bloqueadas (`fiberPick`), confirmação com `spliceFibers`, rodapé das bandejas (Excluir só na vazia), caixa sem cabos e erro com "Tentar novamente"/"Voltar ao mapa". Gaveta à direita ≥ 900px; embaixo até 60dvh no celular. |
| `fiber-list.ts` | Abas por cabo ("CABO-01 · chega aqui") e "Splitters"; tubos recolhíveis com "1/12 em uso" (só com mais de um tubo); cada fibra com bolinha, número, cor e destino; bloqueadas desabilitadas com o motivo; cabo sem fibras com "Abrir ficha do cabo". |
| `fiber-drawer.ts` | Gaveta: desenho da ligação (`app-diagram-line`) e a frase por destino (livre, passa direto, conector, porta, splitter, rompida, outra caixa); emenda via `app-splice-detail`; grade de saídas do splitter; "Emendar", "Ver o caminho", confirmação "Nova emenda" com a frase da bandeja e erro no próprio painel. |
| `splice-detail.ts` | Consulta: posição, de onde chega, para onde sai, perda; "Ver cabo no mapa", "Ver o caminho" e "Excluir emenda". |
| `core/services/map-return.ts` | Recado em memória para o mapa: selecionar (e centralizar) a caixa ou o cabo quando a rede carregar. |

### 2.4.2 Importação de rede (`core/import`, `features/network-import`)

| Arquivo | Responsabilidade |
|---|---|
| `core/import/network-file.ts` | Abre o KMZ (zip: `doc.kml` ou o primeiro `.kml`; imagens guardadas por caminho) ou o KML; decodifica pelo `encoding` do XML. |
| `core/import/kml-reader.ts` | Lê pontos e linhas com pasta, nome, descrição em texto e estilo (cores `aabbggrr` viram `#rrggbb`); casa tags pelo nome local; pula geometria ruim e avisa. |
| `core/import/import-groups.ts` | Agrupa (pontos: pasta + ícone; linhas: pasta + cor + espessura) e sugere o tipo pela pasta ou pela maioria dos nomes. |
| `core/import/import-match.ts` | Reconhece o que já existe (regra em RI-35). |
| `core/import/import-request.ts` | Monta o corpo do `POST`, o resumo da tela e liga as pontas dos cabos à caixa/OLT mais próxima (15 m). |
| `core/import/import-preview.ts` | Prévia no mapa: itens novos e movidos escolhidos. |
| `core/network/geo-distance.ts` | Distância em metros (haversine), usada por clientes e pela importação. |
| `core/api/import-types.ts` | Apelidos dos tipos gerados de `POST /imports/network` (`npm run api:types`). |
| `features/network-import/network-import-store.ts` | Estado da tela, provido pela página: arquivo, grupos, escolhas, resumo e envio. Só recarrega a rede depois de 409. |
| `features/network-import/network-import-page.ts` | Página `/importar`: soltar ou escolher o arquivo, grupos, situação, ligação das pontas, prévia, importar e resultado. |
| `features/network-import/import-group-row.ts` | Uma linha de grupo: tipo, fibras (cabos), abrir para ver e trocar item a item (200 por vez), "Atualizar posição". |

### 2.4.3 Rastreio da fibra (`features/trace`, `core/network/trace-view.ts`, `trace-map.ts`)

| Arquivo | Responsabilidade |
|---|---|
| `core/api/trace-types.ts` | Apelidos dos tipos gerados do rastreio (`npm run api:types`). |
| `core/api/resources/trace-api.ts` | `TraceApi.trace(kind, id, direction)`. |
| `core/network/trace-view.ts` | Frases pt-BR (quebras, títulos, saídas do splitter, tipo de passo, fibra) e leitura de `?trace=KIND:ID`. |
| `core/network/trace-map.ts` | `tracePaths` (traçado dos trechos de cabo) e `traceMarkers` (marcadores vermelhos). |
| `features/trace/trace-store.ts` | Consulta atual, sentido, saída aberta e "Voltar". Provido pela página do mapa. |
| `features/trace/trace-sheet.ts` | Ficha: caminho em ordem, quebras, saídas do splitter e clientes. |

Entradas: "Rastrear" no cabeçalho da caixa e em cada splitter, em cada fibra da ficha do cabo e em cada
emenda da tela de fusões (que volta ao mapa com `?trace=SPLICE:<id>`).

### 2.4.4 Impacto de manutenção (`features/impact`, `core/network/impact-view.ts`)

| Arquivo | Responsabilidade |
|---|---|
| `core/api/impact-types.ts` | Apelidos dos tipos gerados do impacto (`npm run api:types`). |
| `core/api/resources/impact-api.ts` | `ImpactApi.impact(kind, id)`, com `kind` = `cables`, `boxes` ou `olts`. |
| `core/network/impact-view.ts` | Frases de resumo e de totais, aviso de corte, marcadores (caixa, cliente, OLT) e traçado do cabo alvo. |
| `features/impact/impact-store.ts` | Consulta atual; uma consulta nova cancela a anterior. Provido pela página do mapa. |
| `features/impact/impact-sheet.ts` | Ficha: resumo, totais, aviso de corte e lista de clientes por caixa. Clicar numa caixa enquadra no mapa. |

Entradas: "Ver impacto de manutenção" (ícone de alerta) no cabeçalho da ficha do cabo, da caixa e da OLT.
O mapa destaca o traçado do cabo alvo (roxo) e mostra caixas (amarelo), clientes (verde-azulado) e
OLTs (azul-índigo) afetados como marcadores. Resto do mapa esmaece, com o mesmo foco do rastreio.

### 2.5 Ficha da OLT (`features/network-map/olt-sheet`)

| Arquivo | Responsabilidade |
|---|---|
| `core/network/olt-ports.ts` | Portas por placa, numeração de novas portas por placa e o resumo da OLT. |
| `olt-sheet-store.ts` | Portas (`GET /olts/{id}/ports`), cabos (`GET /olts/{id}/cables`) e fibras deles; criação em lote sequencial, ligar/desligar fibra, situação manual e exclusão. |
| `olt-sheet.ts` | Painel à direita do mapa (reaproveita o diálogo de fibras da Etapa 3). |
| `../sheet-support.ts` | `loadCableFibers`: fibras de cada cabo ligado (usado pelas fichas de caixa e OLT); `boxTabs`: abas da ficha da caixa conforme o tipo (RI-29). |

### 2.6 Clientes

| Arquivo | Responsabilidade |
|---|---|
| `core/network/customer-rules.ts` | Explicação das situações, pedido completo (cancelado nunca leva porta), portas escolhíveis com motivo, CTOs por distância, frases da ficha e do histórico. |
| `shared/network/customer-form-dialog.ts` | Cadastro/edição: contrato, situação, CTO e porta (`GET /boxes/{id}/service-ports`). |
| `features/network-map/customer-sheet/customer-sheet.ts` | Ficha do cliente: situação, quem atende, ações rápidas, histórico (`GET /customers/{id}/history`) e exclusão. |
| `NetworkMapRepository` | `createCustomer`, `updateCustomer`, `deleteCustomer`, `findCustomer` (lista do mapa atualizada após sucesso). |

### 2.7 Ajuda (`shared/help`)

| Arquivo | Responsabilidade |
|---|---|
| `core/network/glossary.ts` | Termos da rede com dica curta e explicação; busca sem acento, nome do termo primeiro. |
| `core/network/view-summary.ts` | `describeView`: frase do que está visível e do que filtros escondem. |
| `glossary-dialog.ts` | Glossário pesquisável. |
| `term-hint.ts` | "?" com a dica curta; clique abre o glossário no termo. |
| `view-help-dialog.ts` | "O que estou vendo?": frase, cores dos pontos e das linhas, dicas. |

---

## 3. Regras de interface

- **RI-01 Idioma.** Toda requisição para `apiBaseUrl` envia `Accept-Language: pt-BR`. Requisições
  para outros hosts (tiles do mapa) não são alteradas.
- **RI-02 Coordenadas.** A API usa `{longitude, latitude}` (longitude primeiro) e o app usa
  `{lat, lng}`. A conversão acontece **só** em `core/api/coordinates.ts`.
- **RI-03 Erros em português.** Todo erro da API passa por `parseApiError`, que nunca lança:
  - sem resposta do servidor (status 0): "Não foi possível conectar ao servidor do GeoFiber.
    Verifique se o backend está rodando.";
  - `detail` conhecido do backend: tradução em português (ex.: `Tray 3 is full` → "A bandeja 3
    está cheia."), preservando números e valores;
  - `detail` desconhecido: mensagem pelo status (400 dados inválidos, 404 item não encontrado,
    409 conflito; qualquer outro status mostra "Erro inesperado no servidor"). O texto original
    fica em `ApiError.original`;
  - conflitos de unicidade do backend (código de contrato, número de fibra, porta PON, posição da
    bandeja, elemento repetido no cabo) têm mensagens próprias;
  - corpo que não é ProblemDetail (HTML, vazio): mensagem pelo status.
- **RI-04 Erros por campo.** Erros de validação (`errors[]` do ProblemDetail) viram o erro `api`
  no campo correspondente do formulário (`applyFieldErrors`); campos que o formulário não tem são
  devolvidos e **a tela deve exibi-los** (senão o usuário vê "Verifique os campos destacados." sem
  nenhum campo destacado).
- **RI-05 Armazenamento local.** Ficam no navegador só o tema, as preferências do mapa e os modelos
  de rede. A rede (elementos e cabos) vive só no backend; as chaves antigas (`geofiber.pins.v1`,
  `geofiber.cables.v1`) são apagadas na inicialização, mesmo que o armazenamento esteja bloqueado.
- **RI-06 Exibição de erro.** `NotificationService.apiError(erro)` mostra a mensagem traduzida e
  devolve o `ApiError` (para aplicar os erros por campo).
- **RI-07 Carga da rede.** Ao abrir o mapa, OLTs, caixas, clientes e cabos são carregados juntos.
  Se qualquer lista falhar, aparece a faixa "Não foi possível carregar a rede." com o botão
  "Tentar novamente"; as ferramentas de edição ficam desligadas até a rede carregar.
- **RI-08 Escritas pessimistas.** Criar, editar e excluir só mudam o mapa depois que o servidor
  confirma. O formulário fica aberto (botão "Salvando..."; ESC, clique fora e Cancelar desligados) até a
  resposta; em erro, os campos
  recusados são destacados, a mensagem aparece e nada do que foi digitado se perde.
- **RI-09 Arrasto otimista.** Mover uma OLT/caixa ou um vértice de cabo muda o mapa na hora e envia
  ao servidor; se o servidor recusar, volta à posição anterior e mostra o erro. A resposta de um
  arrasto antigo nunca desfaz um arrasto mais novo do mesmo item.
- **RI-10 Início e fim do cabo.** Só na criação: se o traçado começa ou termina clicando numa OLT
  ou caixa, o formulário oferece "Começa em …" / "Termina em …". A lista de início/fim só é gravada
  quando os dois estão marcados; com só um, o cabo é salvo e o usuário é avisado para completar na
  ficha do cabo (Etapa 2). Editar um cabo nunca altera essa lista.
- **RI-11 Permissão de edição.** `NetworkMapState.canEdit` (sempre `true` até existir
  autenticação) controla as ferramentas, o arrasto, as ações da legenda e a abertura de
  formulários. Arrastar só acontece com a ferramenta "Mover elemento" ou "Mover cabo". Clientes
  são sempre só leitura no mapa.
- **RI-12 Estilo e agrupamento.** Cor e espessura da linha vêm da função do cabo; tracejado e cor
  de alerta vêm da situação (tabelas da seção 2.2). Marcadores próximos são agrupados até o zoom 16; a partir do
  zoom 17 aparecem separados (OLT/caixas e clientes em grupos separados); os cabos são desenhados em canvas.
- **RI-13 Ficha do cabo.** Abre ao selecionar um cabo e fecha quando a seleção muda. Carrega a
  lista de elementos, os tubos e as fibras juntos; respostas de um cabo que não está mais aberto
  são ignoradas. Falha na carga mostra "Tentar novamente" na própria ficha. O balão do cabo usa a
  mesma lista (e se atualiza depois de salvar).
- **RI-14 Lista de elementos.** Os papéis saem da posição (primeiro `START`, último `END`, meio
  `PASS_THROUGH`). Salvar exige pelo menos 2 elementos e nenhum repetido (lista vazia limpa a lista)
  e envia a lista inteira. "Escolher no mapa" põe o próximo clique numa OLT/caixa no fim da lista;
  clientes e repetidos são recusados com aviso; ESC sai do modo. Em erro do servidor o rascunho
  continua aberto. Os elementos da lista ficam com um anel no mapa.
- **RI-15 Estrutura do cabo.** Só é oferecida quando o cabo não tem tubos. Tubos =
  `ceil(capacidade / fibras por tubo)`, o último com o resto, cores ABNT em sequência; tudo numa
  chamada (`POST /cables/{id}/structure`). A situação da fibra (disponível, rompida, reservada) só
  muda com a fibra livre; fibra ocupada não mostra o menu.
- **RI-16 Ficha da caixa.** Abre ao selecionar uma caixa (mesmo lugar da ficha do cabo; só uma por
  vez). Carrega a visão geral e as fibras de cada cabo da caixa; respostas de caixa já fechada são
  ignoradas; toda escrita recarrega a ficha. CTO mostra splitters e portas de atendimento (bandejas
  e conectores só se existirem); CEO/DIO mostram bandejas, fusões, conectores e splitters, sem portas.
- **RI-17 Escolha de fibras.** Só aparecem fibras dos cabos ligados à caixa, que não estão rompidas
  ou reservadas e com a ponta escolhida livre (a fibra já ligada continua na lista). Pontas padrão:
  fusão entrada B / saída A; conector B / A; splitter entrada B, saídas A; porta B. Duas fibras
  iguais são recusadas. Caixa sem fibras: o diálogo explica como ligar um cabo.
- **RI-18 Splitter e portas.** A porta 1 do splitter é a entrada; as saídas aparecem como 1..N.
  Ligar/desligar uma porta do splitter reenvia a atenuação atual. Saída que alimenta porta de
  atendimento não aceita fibra. Nova porta recebe o número seguinte; a origem pode ser uma saída
  livre de splitter, uma fibra ou nenhuma. Porta com cliente não pode ser excluída.
- **RI-19 Ficha da OLT.** Abre ao selecionar uma OLT (mesmo lugar das outras fichas). Respostas de
  OLT já fechada são ignoradas; escritas recarregam. "Adicionar portas" cria N portas na placa
  escolhida, numeradas a partir da maior porta dessa placa, uma de cada vez; na primeira falha as
  demais não são enviadas e a ficha recarrega.
- **RI-20 Porta PON.** Ligar fibra usa as fibras dos cabos da OLT com ponta padrão A; ligar e
  desligar reenviam placa e número. Situação manual (livre, reservada, com defeito) e exclusão só
  aparecem com a porta sem fibra; "Em uso" é automático.
- **RI-21 Cadastro do cliente.** Criado pelo mapa na posição clicada. A CTO é escolhida numa lista
  ordenada pela distância até o cliente (caixas sem posição no fim); a porta só pode ser escolhida
  se estiver livre, sem cliente e com origem de sinal (saída de splitter ou fibra) — as demais
  aparecem desabilitadas com o motivo; a porta atual do cliente sempre pode ser mantida.
- **RI-22 Situação do cliente.** Cada situação tem explicação em linguagem simples. Cancelar pede
  confirmação e nunca envia `servicePortId` (o backend libera a porta). Reativar um cancelado abre
  o formulário já como "Ativo" para escolher a porta. Mudança rápida reenvia todos os dados atuais.
- **RI-23 Histórico.** Mais recente primeiro; recarrega sozinho quando a situação, a porta ou a CTO
  do cliente mudam. Excluir o cadastro é só para erro de cadastro (o texto orienta a cancelar).
- **RI-24 Ajuda contextual.** Os botões "O que estou vendo?" e "Glossário" ficam sempre no mapa, no canto inferior esquerdo (a escala do mapa fica à direita). A
  frase conta OLTs, DIOs, CEOs, CTOs e clientes visíveis e os cabos, com singular/plural, e avisa
  quantos pontos e cabos estão escondidos por filtros, busca ou camadas ocultas.
- **RI-25 Linguagem.** Nenhum código do backend aparece na tela (papéis, razões, situações e pontas
  são sempre traduzidos); pontas A/B só no modo avançado; títulos técnicos das fichas têm "?".
- **RI-26 Tokens.** Cores, raios, sombra e fontes só por `--gf-*` (`src/theme/_tokens.scss`); o tema
  é decidido pela classe `html.dark-theme` via `light-dark()`; nenhum estilo usa
  `prefers-color-scheme`. Raios: 4px em controles, 6px em painéis (botão de ícone continua redondo).
  Fontes: IBM Plex Sans (interface) e IBM Plex Mono (dados, classe `.gf-data`).
- **RI-27 Situação.** A cor de situação nunca é cor de texto; aparece como bolinha, traço ou borda,
  sempre ao lado de um texto em `--gf-text`.
- **RI-28 Fibras.** A bolinha ABNT sempre tem borda, o número usa tinta legível sobre a cor e a
  bolinha tem nome acessível (`app-fiber-dot`).
- **RI-29 Ficha.** Topo fixo com a linha "chega → elemento → sai" e as abas; só o corpo rola; ao
  trocar de elemento a ficha volta ao Resumo. Painel de 400px à direita no computador; gaveta
  embaixo, arrastável, no celular (< 900px; RI-40). Abas: caixa CEO/DIO Resumo · Fusões · Splitters; CTO
  Resumo · Portas · Fusões (só com bandeja ou conector); cabo Resumo · Fibras; OLT Resumo · Portas
  PON; cliente Resumo · Histórico.
- **RI-30 Ocupação.** Sempre `ocupado/total unidade` (`app-occupancy-badge`); some quando o total
  é 0 (a seção mostra o texto de vazio).
- **RI-31 Foco no mapa.** Com um elemento ou cabo selecionado, os outros marcadores ficam a 45% e
  os outros cabos a 35% (selecionados e destacados ficam normais). O tema não troca a camada base:
  só há ruas (OpenStreetMap) e satélite (Esri); camada salva que não existe mais volta para ruas.
- **RI-32 Diagrama de fusões.** Endereço próprio `/caixas/:boxId/fusoes` ("Ver fusões" na ficha da
  caixa, também em CTO sem bandeja). Uma aba por cabo, na ordem chega → passa → sai, e "Splitters"
  se houver; abre no primeiro cabo que chega. Cada fibra mostra o destino em frase curta, sem código
  do backend. Tocar numa fibra ou splitter abre a gaveta com o desenho só daquela ligação. O rodapé
  lista as bandejas ("Bandeja 1 · 3/12"); Excluir só na vazia. Caixa sem cabos: frase e "Voltar ao
  mapa". Voltar leva ao mapa com a caixa selecionada na mesma posição/zoom; se a caixa não estava
  selecionada (link direto), o mapa centraliza nela. Sem `canEdit`: sem Emendar e sem exclusões.
- **RI-33 Emendar por dois toques.** "Emendar" na gaveta de uma fibra livre (ou que passa) entra no
  modo escolher: aviso fixo "Escolha a fibra que vai emendar com …" com Cancelar, a lista abre no
  cabo do outro lado e as fibras em uso ficam desabilitadas com o motivo (`fiberPick`). Escolhida a
  segunda, a gaveta mostra "Nova emenda", o desenho e onde ela vai ("Vai para a bandeja N, na
  próxima posição livre." / "Vou criar a bandeja N (12 posições)." / "Esta caixa não comporta mais
  bandejas.", que desabilita Emendar). A entrada é a fibra do cabo que chega (chega antes de passa
  antes de sai; empate = a primeira tocada); as pontas vão explícitas. A bandeja nova é criada antes
  da fusão, que vai sem posição (o backend usa a próxima livre). Erro aparece na gaveta e mantém a
  escolha; sucesso mostra a emenda nova na gaveta e a tela recarrega sem sumir.
- **RI-34 Espaço do mapa.** A barra de ferramentas é uma coluna fina de 40px sobre o mapa (botões
  de 34px, ícones de 20px, dicas à direita). O painel lateral expandido tem 232px (até 64% da
  largura em telas < 820px) e recolhido 56px (48px no celular). A escolha do tipo (elemento ou
  função do cabo) é um popup de 216px ao lado da barra, em grade de 2 colunas com rolagem própria.
- **RI-40 Mapa no celular e excluir pela ficha.** (a) O painel lateral começa sempre recolhido; recolhido
  ele mostra também os ícones de Importar (com `canEdit`) e Usuários (administrador). (b) Fichas da
  caixa, da OLT e do cabo têm "Mais ações" (⋮, só com `canEdit`) → "Excluir", com a mesma confirmação
  da Legenda. (c) O balão do elemento e do cabo tem o botão "Toque aqui para editar"
  (`data-popup-action="edit"`, `popupEdit`); tocar de novo no item também edita. (d) Abaixo de 900px:
  com qualquer ficha aberta, "O que estou vendo?" e "Glossário" somem; a ficha abre com 35% da
  altura, a alça leva livremente até 90% e soltar abaixo de 20% fecha a ficha (tira a seleção); ao focar um item,
  o mapa o centraliza na parte visível acima da gaveta. (e) Ao escolher o tipo (elemento ou função do
  cabo), a escolha fecha e aparece a faixa "Criar CTO" / "Criar cabo de distribuição" no topo; tocar
  nela reabre a escolha, o X encerra a criação. Entrar na criação (elemento ou cabo) tira a seleção: a
  ficha aberta fecha.

---

- **RI-35 Importar KMZ/KML.** Só com permissão de edição. Nada é apagado por ter sumido do arquivo.
  Cada grupo precisa de um tipo antes de importar (sem escolha, o botão fica desligado); a pessoa
  troca item a item. Já existe = mesmo tipo e nome normalizado (sem acento, maiúsculas, hífen ou
  espaço). Sem nome ou com nome repetido no arquivo, vale a posição: mesmo tipo a até 5 m. Cabo: as
  duas pontas a até 5 m, em qualquer ordem. Mesmo nome com tipo diferente não é duplicado: cria com
  o aviso "já existe uma CTO com este nome". Movido (mesmo nome, outra posição): padrão manter;
  atualiza só se escolhido. Cabo com fibra ligada não tem o traçado trocado (o backend recusa). Pontas
  de cabo novo ligam à caixa ou OLT mais próxima a até 15 m, sem passagem automática. Situação padrão
  dos itens novos: Instalado; fibras por grupo de cabo: 12. Item sem nome recebe o próximo número livre
  do tipo ("CTO importada N", "Cabo importado N"), pulando nomes já usados na rede e no arquivo. Tudo ou nada: uma requisição; acima de
  10.000 itens não envia. Erros do servidor são traduzidos em `error-messages.ts`.

- **RI-36 Rastreio da fibra.** Só leitura: nada é gravado. Uma ficha por vez: abrir o rastreio fecha
  a ficha do cabo, da caixa ou da OLT, e selecionar um desses fecha o rastreio. O traçado usa a
  cor da própria fibra com contorno escuro; o resto do mapa esmaece (mesmo foco da seleção, RI-31). Sentido "Até a OLT"
  ou "Até os clientes" (muda o caminho, não a cor). Só a última consulta chega à tela: resposta de uma consulta
  anterior é descartada. Splitter descendo mostra o resumo ("8 saídas: 5 com cliente, 3 livres");
  "Ver clientes desta saída" abre a saída (`SPLITTER_PORT`) e "Voltar" retorna. Sem saída aberta, "Voltar"
  fecha o rastreio e reabre o item de origem (cabo, caixa ou OLT), guardado ao abrir. A porta PON
  ligada a uma fibra abre o rastreio dessa fibra no sentido descendo (`FIBER`, `DOWNSTREAM`). Saída livre não abre.
  Quebras viram marcador vermelho no mapa, na posição do item ou, sem posição, na última caixa do
  caminho; sem nenhuma posição ficam só na lista. 404 mostra "Não encontramos este item na rede.".

- **RI-37 Impacto de manutenção.** Só leitura. Um cliente depende de um item quando o caminho dele até
  a OLT passa por esse item (cabo, caixa ou OLT); vale só o caminho gravado, sem rota alternativa. A
  ficha agrupa os clientes por caixa de atendimento. A lista corta em 2000 clientes e avisa; os totais
  continuam exatos. Abrir o impacto fecha o rastreio e as outras fichas, e o contrário também vale.
  Item sem clientes mostra "Nenhum cliente depende deste item."; cliente ou caixa sem posição fica só
  na lista. 404 mostra "Não encontramos este item na rede.".

- **RI-38 Sessão e acesso.** O token de acesso fica só em memória (nunca `localStorage` nem
  `sessionStorage`); o refresh só existe no cookie httpOnly. Só um `POST /auth/refresh` fica em
  andamento por vez (o backend encerra todas as sessões se dois chegarem juntos). Ao abrir, o app
  tenta o refresh: deu certo, entra; 401, vai para `/entrar`; sem conexão, `/entrar` mostra "Não foi
  possível conectar ao servidor do GeoFiber." com "Tentar novamente". Só 401 do refresh encerra a
  sessão, com "Sua sessão expirou. Entre novamente." e volta ao endereço de antes (`voltar` só aceita
  caminho interno). Erros 401/403 usam o texto em português do backend; 403 de dono ("Só o criador
  pode alterar este elemento.") vira aviso e o formulário continua aberto. Editar e excluir aparecem
  para todos que entraram (`canEdit` segue `true`): o backend decide o dono. Papéis na tela como
  "Administrador" e "Técnico"; só o administrador vê "Usuários" no painel lateral.

- **RI-39 Gerenciar usuários.** `/usuarios` só abre para administrador (`authGuard` e depois
  `adminGuard`; técnico vai ao mapa, sem sessão vai a `/entrar?voltar=%2Fusuarios`). A lista vem de
  `GET /users` e mostra nome, e-mail e "Administrador"/"Técnico" · "Ativa"/"Desativada"; erro ao
  carregar mostra a mensagem e "Tentar novamente". A própria linha tem "(você)" e não tem
  "Desativar" (o backend também recusa com 409). "Desativar" pede confirmação ("Ela sai do sistema
  em até 15 minutos e não consegue entrar de novo até ser reativada."); "Reativar" não. Uma troca
  por vez; a lista só muda depois do sucesso, recarregando. "Trocar senha" aparece em todas as
  linhas e encerra as sessões da pessoa no backend; na própria conta o administrador sai em seguida
  e entra com a senha nova. Só a recarga mais recente da lista vale. "Cadastrar" recarrega a lista quando alguém foi
  criado.

## 4. Testes

`npm test` (Vitest). Os serviços da API são testados contra a URL, o método e o corpo exatos de
cada endpoint (`src/testing/api-endpoints.ts`); a tradução de erros cobre servidor desligado,
corpo inválido, valores variáveis e textos desconhecidos.

## 5. Limitações conhecidas

- Sem paginação nem busca por área: o mapa carrega a rede inteira (a Etapa B traz a busca por
  área e o cache).
- Clientes aparecem no mapa, mas o cadastro deles chega na Etapa 5.
- Importação de KMZ/KML depende do endpoint `POST /imports/network` no backend; sem ele, o envio falha. Não há exportação nem importação de clientes.
- A lista completa de elementos do cabo (passagens) é editada na ficha do cabo (Etapa 2).
- Os modelos não ficam vinculados aos elementos: só preenchem o formulário.
- Os tipos gerados marcam quase todos os campos de resposta como opcionais, porque o OpenAPI do
  backend não declara campos obrigatórios nas respostas.
- `npm run api:types` baixa o `openapi-typescript@7.13.0` via `npx` na primeira execução (ele ainda
  não declara suporte ao TypeScript 6 usado no projeto, por isso não está nas dependências).
