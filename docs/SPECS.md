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

### 1.2 Ainda não entregue
- Rastreio do sinal de ponta a ponta (adiado no roadmap) e escala B (listas paginadas).
- Busca por área e cache (Etapa B). Rastreio de fibra (futuro).

---

## 2. Arquitetura da camada de API

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
| Danificado | vermelha, pontilhada (`4 6`) |
| Desativado | cinza, opacidade 0,5 |

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
| `box-sheet-store.ts` | Estado da ficha aberta: `GET /boxes/{id}/overview` + fibras de cada cabo; escritas de bandeja, fusão, conector, splitter e porta (sempre recarrega). |
| `fiber-link-dialog.ts` | Diálogo único para escolher fibras (fusão, conector, splitter, porta); pontas A/B no modo avançado. |
| `box-sheet.ts` | Painel à direita do mapa; seções conforme o tipo (CTO: splitters e portas; CEO/DIO: bandejas, fusões e conectores). |

### 2.5 Ficha da OLT (`features/network-map/olt-sheet`)

| Arquivo | Responsabilidade |
|---|---|
| `core/network/olt-ports.ts` | Portas por placa, numeração de novas portas por placa e o resumo da OLT. |
| `olt-sheet-store.ts` | Portas (`GET /olts/{id}/ports`), cabos (`GET /olts/{id}/cables`) e fibras deles; criação em lote sequencial, ligar/desligar fibra, situação manual e exclusão. |
| `olt-sheet.ts` | Painel à direita do mapa (reaproveita o diálogo de fibras da Etapa 3). |
| `../sheet-support.ts` | `loadCableFibers`: fibras de cada cabo ligado (usado pelas fichas de caixa e OLT). |

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
- **RI-24 Ajuda contextual.** Os botões "O que estou vendo?" e "Glossário" ficam sempre no mapa. A
  frase conta OLTs, DIOs, CEOs, CTOs e clientes visíveis e os cabos, com singular/plural, e avisa
  quantos pontos e cabos estão escondidos por filtros, busca ou camadas ocultas.
- **RI-25 Linguagem.** Nenhum código do backend aparece na tela (papéis, razões, situações e pontas
  são sempre traduzidos); pontas A/B só no modo avançado; títulos técnicos das fichas têm "?".

---

## 4. Testes

`npm test` (Vitest). Os serviços da API são testados contra a URL, o método e o corpo exatos de
cada endpoint (`src/testing/api-endpoints.ts`); a tradução de erros cobre servidor desligado,
corpo inválido, valores variáveis e textos desconhecidos.

## 5. Limitações conhecidas

- Sem paginação nem busca por área: o mapa carrega a rede inteira (a Etapa B traz a busca por
  área e o cache).
- Clientes aparecem no mapa, mas o cadastro deles chega na Etapa 5.
- A lista completa de elementos do cabo (passagens) é editada na ficha do cabo (Etapa 2).
- Os modelos não ficam vinculados aos elementos: só preenchem o formulário.
- Os tipos gerados marcam quase todos os campos de resposta como opcionais, porque o OpenAPI do
  backend não declara campos obrigatórios nas respostas.
- `npm run api:types` baixa o `openapi-typescript@7.13.0` via `npx` na primeira execução (ele ainda
  não declara suporte ao TypeScript 6 usado no projeto, por isso não está nas dependências).
