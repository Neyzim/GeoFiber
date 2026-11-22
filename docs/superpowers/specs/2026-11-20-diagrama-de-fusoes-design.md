# Diagrama de fusões — design

Data: 2026-11-20 · Situação: **etapa 1 implementada** (2026-11-21, plano `2026-11-21-diagrama-de-fusoes.md`); etapa 2 pendente.

## Intenção

O mercado de FTTH documenta o interior de uma caixa com o **diagrama de fusões**: o cabo que chega de
um lado, o que sai do outro, splitters no meio e uma linha para cada emenda, nas cores ABNT. Não há
norma para o desenho (só para as cores), mas a convenção é comum (FTTx Planner, Cadfiber, FTTH Doc,
ROUTE-MAP). O dono quer seguir essa direção, mas de forma mais amigável: os diagramas que viu são
**técnicos demais, poluem quando a caixa cresce e têm textos pouco claros**.

O diagrama **substitui** a tela por bandeja de `/caixas/:boxId/fusoes`. A pergunta que ele responde:
"o que acontece com cada fibra nesta caixa?", não "o que está na posição 5 da bandeja 1?".

## Decisões do dono

- Direção visual: **clássico completo com foco** (todas as fibras, agrupadas por tubo; tocar destaca
  o caminho e apaga o resto) no computador.
- Celular: **um cabo por vez, com o destino ao lado** (abas de cabos, uma linha por fibra).
- Ao tocar numa fibra: uma **gaveta** sobe com o desenho só daquela ligação (ver "Gaveta").
- Emendar por **dois toques** (sem arrastar): fibra livre → destino → "Emendar".
- O diagrama **substitui** a tela de bandejas.
- Entrega em **duas etapas (B)**: etapa 1 = lista com gaveta em todas as telas, já substituindo as
  bandejas e emendando; etapa 2 = desenho clássico com linhas no computador, sobre a mesma regra.
- Sem bandeja com posição livre, **o front cria a bandeja** e emenda em seguida (opção 1).
- Elementos desenhados em SVG/HTML no código (não imagens .jpg): cor vem dos dados, nítido em zoom,
  tema escuro, clicável, exporta.

## Objetivos (etapa 1)

1. Para cada cabo da caixa, listar todas as fibras na ordem (tubo → fibra), com a bolinha ABNT e o
   **destino em português simples**: "→ Splitter 1:16", "→ Backbone 1 · Verde 2", "conector",
   "porta de atendimento 3", "passa direto", "livre", "rompida", "reservada".
2. Uma aba "Splitters" com cada splitter: entrada e saídas (com nome do cliente quando houver).
3. Tocar numa fibra (ou splitter) abre a gaveta com o desenho daquela ligação e ações.
4. Emendar fibra com fibra por dois toques, sem precisar escolher bandeja nem posição.
5. A bandeja e a posição continuam visíveis **na gaveta** ("Na caixa: bandeja 1 · posição 3"), para
   achar a emenda na caixa física.
6. Funcionar bem no celular (alvos de toque ≥ 40px, sem gesto de arrastar).

## Não-objetivos (etapa 1)

- O desenho clássico com linhas (etapa 2, design próprio sobre esta regra).
- Ligar fibra a splitter, conector ou porta de atendimento pelo diagrama: continua na ficha da caixa
  (diálogo de fibras existente). A gaveta só mostra essas ligações.
- Exportar PDF ("plano de fusão").
- Mudar o backend.

## Antiobjetivos

- Tela que exige saber o que é ponta A/B, `PASS_THROUGH` ou `trayNumber`.
- Mostrar todas as linhas de todas as fibras ao mesmo tempo no celular.
- Arrastar e soltar como único jeito de emendar.

## Abordagens consideradas

- **A. Tudo de uma vez** (lista no celular e desenho clássico no computador): entrega completa, mas
  a parte mais cara (posicionar fibras e traçar linhas sem cruzar) chega antes de validar a regra.
- **B. Duas etapas — escolhida.** Etapa 1 valida a regra de destinos e o fluxo de emendar com uso
  real; a etapa 2 desenha por cima sem jogar nada fora.
- Bandeja quando falta espaço: **1. front cria (escolhida)** — duas chamadas, sem backend novo;
  **2. backend cria** — mais atômico, mas depende de mudança no backend antes.

## Como fica a tela

### Celular (< 900px)

```
‹ O1-C1-R2                Diagrama
[Cabo 01 · chega] [Backbone 1 · passa] [Splitters]
● 1 Verde       → Splitter 1:16
● 2 Amarelo     → Backbone 1 · Verde 2
● 3 Branco        livre
▾ Tubo Amarelo · 0/12 em uso
──────── gaveta ────────
```

- Cabeçalho igual ao de hoje (voltar ao mapa, nome, situação).
- Abas: um chip por cabo da caixa, com o nome e "chega", "sai" ou "passa" (texto de
  `attachmentText`), e a aba "Splitters" quando a caixa tiver splitter. Ordem: cabos que chegam,
  que passam, que saem; depois Splitters.
- Linha da fibra: bolinha ABNT, "N Cor" (número no tubo e nome da cor), destino à direita como chip
  (ligada) ou texto cinza (livre/rompida/reservada).
- **Tubos:** cabo com mais de um tubo mostra o cabeçalho do tubo (bolinha na cor do tubo, "Tubo
  Verde", "3/12 em uso"). Todos abertos por padrão; o cabeçalho recolhe/abre.

### Estados da tela

- Carregando: barra de progresso (como hoje).
- Erro ao carregar: a frase, "Tentar novamente" e "Voltar ao mapa" (como hoje).
- Caixa sem cabos: "Nenhum cabo chega aqui ainda. Inclua esta caixa na lista de um cabo, na ficha
  do cabo." e "Voltar ao mapa".
- Cabo sem fibras cadastradas: na aba dele, "Este cabo ainda não tem fibras." e "Abrir ficha do
  cabo" (como hoje).
- Tema claro e escuro pelos tokens `--gf-*`.

### Computador (≥ 900px)

Etapa 1: a mesma lista à esquerda e a gaveta vira o **painel da direita** (o layout `has-panel` que a
tela já usa). Etapa 2 troca a lista pelo desenho clássico.

### Gaveta (painel)

Mostra o desenho "chega → elemento → sai" (o `app-diagram-line` existente) e ações. Casos:

- **Fibra emendada:** "Cabo 01 · fibra 2 Amarelo ── fusão ── Backbone 1 · tubo Verde · 2";
  "Na caixa: bandeja 1 · posição 3 · perda 0,05 dB" (perda só se houver). Ações: "Ver o caminho"
  (rastreio da emenda, como hoje), "Desfazer emenda" (com confirmação).
- **Fibra no splitter:** "Cabo 01 · fibra 1 ── Splitter 1:16" e a grade de saídas: ocupada mostra o
  número e o nome do cliente; livre, só o número. Ação: "Ver o caminho".
- **Conector / porta de atendimento / OLT:** desenho com o elemento e a frase ("ligada por conector",
  "porta de atendimento 3 · Maria"). Ação: "Ver o caminho".
- **Livre:** "Esta fibra está livre nesta caixa." Ação principal: **Emendar**.
- **Passa direto** (cabo que passa, sem ligação aqui): "Esta fibra passa direto pela caixa, sem
  emenda." Ação: **Emendar** (sangria).
- **Rompida / reservada:** a frase, sem ações.
- **Emendada em outra caixa:** "Emendada em outra caixa", sem ações.
- **Splitter (aba Splitters):** entrada (fibra ou "sem entrada") e grade das saídas.

### Emendar (dois toques)

1. Na gaveta de uma fibra livre, toca **Emendar**. A tela entra em "escolher destino": aviso fixo no
   topo ("Escolha a fibra que vai emendar com Cabo 01 · 3 Branco" + "Cancelar"), abre a aba do
   cabo padrão do outro lado (regra `defaultSpliceCables`, trocável pelas abas) e só fibras livres
   ficam tocáveis; as outras ficam apagadas com o motivo (regra `fiberPick`).
2. Toca a fibra de destino. A gaveta mostra a emenda tracejada e onde vai ficar ("bandeja 1 ·
   próxima posição livre"), ou, sem espaço, "Vou criar a bandeja 2 (12 posições)". Botões
   **Emendar** e **Cancelar**.
3. Ao confirmar: se precisar, cria a bandeja; depois `POST /splices` com `trayNumber` e sem
   `positionNumber` (o backend escolhe a próxima livre), com as pontas explícitas pela regra
   `usedEnd`. Sucesso recarrega a tela e abre a gaveta da emenda nova. Erro aparece na gaveta,
   traduzido (como `saveSplice` faz hoje), e mantém a escolha.

O destino pode ser do **mesmo cabo** (sangria num cabo que passa): a aba do próprio cabo continua
disponível; só a fibra já escolhida fica bloqueada ("já escolhida do outro lado").

Qual fibra é "entrada" e qual é "saída" no pedido: a do cabo que chega (END) ou passa é a entrada; a
do cabo que sai (START) é a saída. Dois cabos com o mesmo papel: a primeira tocada é a entrada.

### Bandejas

Sem tela própria. **Escolha da bandeja para emenda nova:** a de menor número com posição livre
(`usedPositions < capacity`). Nenhuma: cria a próxima (`nextNumber`), com capacidade 12, se o
número não passar de `trayCapacity` da caixa; se passar, a gaveta diz "Esta caixa não comporta mais
bandejas" e não emenda. No rodapé da lista, uma linha discreta "Bandejas: 1 · 3/12 em uso" com
"Excluir" nas bandejas vazias (confirmação). Fusões sem posição válida continuam acessíveis: a gaveta
da fibra mostra "bandeja 1 · sem posição definida".

## Regra de destinos (núcleo, pura, testável)

Nova função em `core/network/` (nome do construtor), entrada: overview da caixa e o `FiberIndex`;
saída: por cabo, tubos e fibras com o destino nesta caixa. Usa só dados que a tela já carrega
(`overview`: cabos, bandejas, fusões, splitters, conectores, portas, clientes; `fiberIndex` com as
pontas e ligações de cada fibra). Destinos:

| Situação | Texto curto (linha) | Gaveta |
|---|---|---|
| Fusão nesta caixa | "→ {outro cabo} · {Cor do tubo} {n}" | emendada |
| Porta de splitter nesta caixa | "→ Splitter 1:16" (entrada) ou "← Splitter 1:16 · saída 3" | splitter |
| Conector nesta caixa | "→ conector" | conector |
| Porta de atendimento | "→ porta 3 · Maria" | porta |
| Porta da OLT | "→ OLT" | OLT |
| Cabo que passa, sem ligação aqui | "passa direto" | livre (pode emendar: sangria) |
| Cabo que chega/sai, sem ligação aqui | "livre" | livre |
| Rompida / reservada | "rompida" / "reservada" | frase |
| Ligada em outra caixa (na ponta usada) | "em outra caixa" | frase |

Ponta considerada em cada cabo: a de `usedEnd(role, lado)`, como hoje; cabo que passa mostra a ponta
que chega e, se livre, permite emendar a que sai (decisão já tomada na tela atual).

## O que sai e o que fica

- **Sai:** `tray-board` (grade de posições), "+ bandeja" com capacidades, abas de bandejas,
  `trayPositions`/`unplacedSplices` se ficarem sem uso, `cable-strip` (vira as abas).
- **Fica / reaproveita:** rota e `BoxSheetStore` (ganha "criar bandeja e emendar"), `fiberPick`,
  `usedEnd`, `defaultSpliceCables`, `fiberShortName`, `cableTubes`, `app-fiber-dot`,
  `app-diagram-line`, `splice-detail` (vira o caso "emendada" da gaveta), entrada "Rastrear esta
  emenda", `MapReturnService`.
- Links existentes para `/caixas/:id/fusoes` (ficha da caixa "Ver fusões", rastreio) continuam.

## Restrições

- Angular 22, signals, OnPush; TDD; docs junto (SPECS, GUIA, README, CLAUDE). Sem backend novo.
- Textos pt-BR simples; nenhum código do backend na tela; pontas A/B só em modo avançado (aqui não
  aparecem).
- Edição passa por `canEdit` (sem ele, gaveta só mostra, sem "Emendar"/"Desfazer").
- Escritas pessimistas (recarrega após sucesso); `disableClose`-equivalente: enquanto salva, botões
  desabilitados.

## O que fica para quem constrói

Nomes de arquivos e componentes; textos exatos além dos acima; como mostrar o nome do cliente na
saída do splitter (a ficha da caixa já liga splitter → porta → cliente); ícones; animação da gaveta.

## Decisões tomadas sem o dono (revisar)

- Ligar fibra a splitter/conector/porta pelo diagrama fica fora da etapa 1 (continua na ficha).
- Tubos todos abertos por padrão, recolhíveis pelo cabeçalho.
- Bandeja criada automaticamente com 12 posições; respeita `trayCapacity`.
- Excluir bandeja vazia por uma linha discreta no rodapé, já que a tela de bandejas sai.
- Após emendar, a gaveta abre na emenda nova.
- Quando dois cabos têm o mesmo papel, a primeira fibra tocada é a entrada da fusão.
