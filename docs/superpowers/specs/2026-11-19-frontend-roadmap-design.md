# GeoFiber Frontend — Roadmap de integração com o backend (design)

- **Data:** 2026-11-19
- **Status:** aguardando aprovação (revisado após a leitura de um revisor)
- **Backend de referência:** Fase 1 concluída (`geofiber-backend/API.md`, `docs/SPECS.md`, OpenAPI em
  `http://localhost:8080/v3/api-docs`)

## 1. Intenção

O GeoFiber é um mapeador open source de redes FTTH. O frontend (Angular 22 + Angular Material +
Leaflet) nasceu como protótipo: tudo fica no `localStorage`, com tipos de elemento próprios e
nenhuma chamada à API. O backend da Fase 1 já cadastra e valida a rede completa, da OLT ao cliente.

Este roadmap leva o frontend a ser o cliente real desse backend, servindo a dois públicos:

1. **Técnico** — documenta a rede: desenha caixas e cabos no mapa, cadastra tubos e fibras,
   fusões, splitters, portas e clientes.
2. **Pessoa com menos conhecimento técnico** — navega na documentação e entende o que está
   acontecendo: o que tem em cada caixa, por onde passa cada cabo, qual cliente está em qual porta.

**Sucesso:** um técnico consegue documentar, só pelo frontend, o exemplo completo do `API.md`
(OLT → CEO → CTO → cliente), e uma pessoa leiga consegue abrir a caixa e entender o que vê.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- O backend é a fonte da verdade de toda a rede. Tipos, status e enums do frontend seguem o backend.
- Telas para todos os recursos da Fase 1 do backend.
- Mapa fluido com alguns milhares de elementos (abordagem A, seção 4).
- Explicações em linguagem simples para quem não é técnico.
- **Documentação a cada etapa** (seção 6).

**Não-objetivos (por agora)**
- **Rastreio de fibra / caminho do sinal** (fiber tracer): fica para depois e depende de um
  endpoint no backend.
- Busca por área do mapa e cache por área: Etapa B, junto da Fase 2 do backend.
- Autenticação e multiusuário (o backend também não tem).
- Modo offline e migração dos dados do `localStorage` atual.

**Anti-objetivos (seria falha mesmo funcionando)**
- O frontend deduzir ligações por proximidade no mapa. A continuidade é sempre declarada, como no
  backend.
- Duplicar no frontend regras que o backend já valida, com risco de divergência. O frontend pode
  orientar o usuário (desabilitar opções óbvias), mas a palavra final é a resposta da API.
- Telas que só técnicos entendem: siglas sem explicação, IDs crus, mensagens de erro em inglês.

## 3. Restrições

- Stack mantida: Angular 22 standalone, signals, zoneless, Angular Material, Leaflet, Vitest.
- **CORS:** configurado pelo dono do projeto no backend. O frontend só precisa da URL da API
  configurável.
- O backend não pagina listas: o frontend carrega cada coleção inteira até a Etapa B.
- Erros chegam como ProblemDetail (RFC 9457). O `detail` vem sempre em inglês. As mensagens de
  validação (`errors[]`) seguem o `Accept-Language`, então o frontend envia `pt-BR`.
- Coordenadas da API: `{longitude, latitude}`. O Leaflet usa `{lat, lng}`. A conversão fica num
  único ponto.

## 4. Abordagens consideradas para escala do mapa

| | Abordagem | Trade-off |
|---|---|---|
| **A** | Só frontend: carrega tudo, desenha em canvas (`preferCanvas`) e agrupa pontos em zoom afastado | Sem mudança no backend. Aguenta alguns milhares de elementos; acima de ~20 mil o download e a memória pesam. |
| **B** | Endpoint leve de mapa por área (`bbox` + `zoom`) no PostGIS, geometria simplificada, cache por área com ETag; detalhes sob demanda | Escala para centenas de milhares. Exige trabalho no backend (fora da Fase 1). |
| C | Vector tiles gerados pelo PostGIS + MapLibre | O mais escalável, mas troca a biblioteca de mapa. Exagero para o tamanho atual. |

**Escolhido:** **A agora, B na Fase 2 do backend.** O frontend é organizado para que a troca seja só
de fonte de dados: as telas consomem um "repositório do mapa", e só esse repositório muda na Etapa B.

## 5. Decisões já tomadas

1. **Tipos de elemento = backend.** No mapa existem apenas OLT, caixa (CTO, CEO, DIO), cliente e
   cabo. Saem: poste, reserva técnica, splitter como PIN e ponto genérico. O splitter passa a viver
   dentro da caixa.
2. **Status = backend.** Infraestrutura (OLT, caixa, cabo): `PLANNED, INSTALLED, ACTIVE, DAMAGED,
   DEACTIVATED`. Cliente: `ACTIVE, BLOCKED, CANCELLED`. Fibra: `AVAILABLE, OCCUPIED, BROKEN,
   RESERVED`. Portas: `FREE, OCCUPIED, RESERVED, FAULTY`.
3. **Função do cabo = backend:** `BACKBONE, FEEDER, DISTRIBUTION, DROP, INTERCONNECTION`
   (rótulos em português na tela).
4. **Modelos de rede viram atalhos locais.** Continuam no `localStorage` e só preenchem o formulário
   (capacidades, `manufacturer`, `model`, capacidade de fibras). O elemento salvo no backend não
   guarda referência ao modelo. A cor no mapa vem da função/tipo e do status. Se no futuro for
   preciso compartilhar o catálogo, ele vira um endpoint no backend.
5. **Ajustes no backend antes da Etapa 2** (feitos pelo dono do projeto no `geofiber-backend`).
   Os endpoints de escrita da Fase 1 bastam, mas faltam leituras agregadas; sem elas, abrir uma
   caixa exigiria centenas de chamadas. Pré-requisitos:
   - `GET /boxes/{id}/cables` e `GET /olts/{id}/cables`: cabos que têm o elemento na sua lista.
   - `GET /cables/{id}/fibers`: todas as fibras do cabo, com o tubo de cada uma.
   - `GET /boxes/{id}/overview`: tudo que está dentro da caixa numa resposta (cabos anexados,
     bandejas, fusões, conexões, splitters, portas de atendimento e clientes).
   - `POST /cables/{id}/structure`: cria tubos e fibras de um cabo numa única transação (tudo ou
     nada), a partir de um arranjo (ex.: 12 tubos × 12 fibras, cores ABNT em sequência).
   Os nomes exatos e os payloads são definidos no backend; o frontend se adapta.
6. **Estrutura do cabo gerada pelo backend.** Ao criar um cabo, o técnico escolhe o arranjo de
   tubos e fibras (os modelos podem sugerir um) e o frontend chama o endpoint de estrutura. Não há
   criação de 150 fibras em chamadas separadas pelo frontend. Tubos e fibras avulsos continuam
   possíveis pelos endpoints da Fase 1.
7. **Traçar um cabo** começando ou terminando com clique numa caixa/OLT *sugere* START/END na lista
   de elementos; o técnico confirma antes de salvar. *(decisão do executor do roadmap)*
8. **Mover uma caixa ou OLT não move as pontas dos cabos.** O backend não liga a geometria à lista
   de elementos; o técnico ajusta o traçado. *(decisão do executor do roadmap)*
9. **Rastreio de fibra fica para depois** (não está em nenhuma etapa deste roadmap).
10. **Escopo deste documento:** é o roadmap. Cada etapa passa por seu próprio design e plano antes
    de ser construída; o primeiro plano detalhado é o da Etapa 0.

## 6. Documentação (regra de todas as etapas)

Nenhuma etapa está concluída sem a documentação atualizada no mesmo PR:

- **`docs/SPECS.md`** (novo, no mesmo estilo do backend): o que o frontend faz, telas, regras de
  interface e mapeamento para os endpoints. Atualizado a cada etapa.
- **`README.md`**: reescrito em português (como rodar, configurar a URL da API, testar).
- **`docs/GUIA.md`** (novo): guia de uso para o técnico e para a pessoa leiga, com glossário
  (OLT, CEO, CTO, DIO, splitter, ponta A/B, bandeja, fusão…). Cada etapa acrescenta a seção das
  telas que entregou.
- Por etapa: o design e o plano em `docs/superpowers/specs` e `docs/superpowers/plans`.

## 7. Roadmap

Cada etapa é entregável sozinha, com testes (Vitest) e documentação.

### Etapa 0 — Fundação
- `provideHttpClient` com URL da API configurável (`environment` / `apiBaseUrl`) e envio de
  `Accept-Language: pt-BR`.
- Tipos TypeScript **gerados do OpenAPI** do backend, com um script npm para regenerar.
- Um serviço por recurso da API (olts, boxes, cables, tubes/fibers, trays, splices, splitters,
  service-ports, connections, customers).
- Tratamento de erros: ProblemDetail → mensagem em português. Os `detail` 409 conhecidos do
  `API.md`/`SPECS.md` ganham tradução; os desconhecidos mostram texto genérico + o original.
  `errors[]` de 400 vão para os campos do formulário.
- Conversor único `{longitude, latitude}` ↔ `{lat, lng}`.
- Remover a persistência local de PINs e cabos (dados de teste são descartados). Tema,
  preferências do mapa e modelos continuam locais.
- Docs: `README.md` reescrito, `docs/SPECS.md` e `docs/GUIA.md` criados.

### Etapa 1 — Mapa ligado à API
- OLTs, caixas e clientes como marcadores; cabos como linhas, com cor por função e estilo por
  status. Comprimento (`lengthMeters`) exibido no cabo.
- Criar, editar, mover e excluir OLT, caixa e cabo pela API (traçado do cabo e posição dos pontos
  incluídos). Lista de elementos do cabo sugerida ao traçar (decisões 7 e 8). Clientes aparecem no mapa; o cadastro completo vem na Etapa 5.
- Renderização em canvas e agrupamento de marcadores em zoom afastado.
- Legenda, filtros e busca refeitos sobre os novos tipos e status.
- Tela "Modelos" ajustada ao papel de atalho (decisão 4).

### Pré-requisito no backend (antes da Etapa 2)
- Endpoints da decisão 5, implementados no `geofiber-backend` e documentados no `API.md`/`SPECS.md`
  de lá. O frontend regenera os tipos do OpenAPI quando estiverem prontos.

### Etapa 2 — Ficha do cabo
- Criação da estrutura (tubos e fibras) pelo endpoint do backend, com escolha do arranjo.
- Tubos e fibras com as 12 cores ABNT/TIA, numeração no tubo e no cabo, e status da fibra
  (marcar rompida/reservada).
- Elementos do cabo (início, passagens, fim), escolhidos clicando nas caixas/OLTs no mapa ou numa
  lista. Mostrar no mapa as caixas e OLTs que pertencem ao cabo.
- Explicação simples na ficha: "este cabo sai de X, passa por Y e termina em Z".

### Etapa 3 — Interior da caixa
- CEO/DIO: bandejas, fusões (com posição e atenuação) e conexões por conector.
- CTO: splitters (com a geração automática das portas de atendimento) e portas de atendimento com a
  fonte (saída de splitter ou fibra).
- **Diagrama visual da caixa**: cabos que entram, fibras, fusões, splitter e portas, de modo que
  uma pessoa leiga entenda o que acontece dentro dela.
- Ponta A/B: escondida por padrão (usa a ponta padrão do backend), com opção avançada para trocar.

### Etapa 4 — OLT e portas PON
- Portas PON (slot/porta), status e ligação da fibra (ponta A por padrão).

### Etapa 5 — Clientes
- Cadastro, edição, situação (ativo, bloqueado, cancelado) e escolha da porta de atendimento (só
  portas livres e com fonte).
- Histórico do cliente.
- Explicação do que cada situação significa (ex.: cancelado libera a porta, mas mantém o cadastro).

### Etapa 6 — Navegação para leigos
- Textos explicativos em cada ficha, glossário acessível na interface e "o que estou vendo"
  nos painéis.
- Revisão de linguagem de todas as telas (sem IDs crus, sem siglas sem explicação).

### Etapa B — Escala (junto da Fase 2 do backend)
- Backend: endpoint de mapa por área (`bbox` + `zoom`) com geometria simplificada.
- Frontend: trocar a fonte do repositório do mapa, cache por área já carregada, detalhes sob
  demanda.

### Futuro (fora deste roadmap)
- Rastreio de fibra / caminho do sinal, com endpoint dedicado no backend.

## 8. Deixado para o executor de cada etapa
- Biblioteca de agrupamento de marcadores e ferramenta de geração de tipos do OpenAPI.
- Layout exato das fichas e do diagrama da caixa (cada etapa passa por seu próprio design).
- Organização interna de pastas e serviços, seguindo o padrão atual (`core/`, `features/`,
  `shared/`).
