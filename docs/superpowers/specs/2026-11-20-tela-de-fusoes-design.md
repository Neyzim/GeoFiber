# Tela de fusões da caixa — design

Data: 2026-11-20 · Situação: rascunho para aprovação do dono.

## Intenção

O técnico em campo está **levantando uma rede que já existe**: abre a caixa real, olha a bandeja e
registra cada emenda. Hoje ele escolhe as fibras em listas suspensas do tipo "CABO-01, tubo 1
(Verde), fibra 3 (Branco)", o que confunde e gera erro. A nova tela **imita o que ele vê na frente
dele**: a bandeja com as posições numeradas e as fibras com as cores reais. O mesmo desenho serve
depois como **consulta** para outros técnicos que nunca estiveram naquele ponto e para o atendente
do provedor entender o que está ligado com o quê.

Palavras do dono: "simular o que ele está vendo na frente dele na vida real, pois isso também vai
servir como consulta posteriormente para outros técnicos"; "rápido, fácil, bonito e funcional";
"tabelas confundem o técnico e podem gerar erros"; "precisa ser responsivo e claro".

## Objetivos

1. Registrar uma fusão com **dois toques em fibras coloridas** (uma de cada lado) numa **posição
   exata** da bandeja.
2. A bandeja na tela tem **as mesmas posições da bandeja física**, inclusive as vazias.
3. Consultar uma emenda existente tocando nela: de onde chega, para onde sai, perda.
4. "Abrir" um cabo da caixa e ver seus tubos e fibras, com onde cada fibra está emendada.
5. Funcionar bem do celular (em pé, com luva) ao monitor.
6. Página com endereço próprio, para mandar o link a outro técnico ou ao atendente.

## Fora do escopo (agora)

- Rastreio de fibra pela rede (segue adiado no roadmap).
- 3D (avaliado e descartado para registro: toque impreciso, peso no celular, cada modelo de caixa é
  diferente; pode voltar como visualização só de leitura).
- Conectores, splitters e portas de atendimento continuam na ficha da caixa como estão.
- Permissão do atendente: tudo passa por `NetworkMapState.canEdit` como no resto do app.
- Editar uma fusão: o backend não tem `PUT`; corrigir = excluir e registrar de novo.
- Arrastar para ligar.

## Anti-objetivos

- Qualquer tabela ou lista suspensa para escolher fibra nesta tela.
- Códigos do backend na tela (`START`, `B`…); pontas A/B só no modo avançado.
- Um desenho que não bate com a caixa real (posições "compactadas").

## Restrições (backend e projeto)

- `POST /boxes/{boxId}/splices` aceita `positionNumber` **opcional** (1..capacidade). Acima da
  capacidade → 400; posição ocupada → 409; sem o campo, o backend usa a próxima livre. Antes de
  implementar: `npm run api:types` (o tipo `SpliceRequest` gerado ainda não tem o campo).
- Sem `PUT` de fusão. `DELETE /boxes/{boxId}/splices/{id}` existe.
- Bandejas: `POST/PUT/DELETE /boxes/{boxId}/trays`. Excluir só bandeja vazia (regra já usada).
- Pontas padrão da fusão: entrada B, saída A; a fibra só aparece disponível se a ponta usada
  estiver livre (`isEndFree`).
- Dados vêm de `GET /boxes/{id}/overview` (`box`, `cables`, `trays`, `splices`…) + fibras de cada
  cabo (`loadCableFibers` / `indexFibers`). Sem rota nova no backend.
- Escritas pessimistas; erros traduzidos por `error-messages.ts`; textos pt-BR simples; Angular
  standalone, signals, OnPush; TDD; documentação junto (SPECS, GUIA, README, CLAUDE.md, plano).

## Abordagens consideradas

**Onde a tela abre**
- **Página própria `/caixas/:boxId/fusoes` — escolhida pelo dono.** Botão voltar do celular
  funciona, recarregar não perde o lugar, dá para compartilhar o link. Custo: o mapa é recriado ao
  voltar → guardar posição do mapa e reabrir a ficha da caixa.
- Janela cheia sobre o mapa. Volta perfeita ao mapa, mas sem link e com o "voltar" do celular
  fechando o app.

**Como desenhar** (mostrado em desenhos no navegador)
- A · dois cabos lado a lado com tubos e fibras coloridas, tocar uma de cada lado.
- B · passo a passo cabo → tubo → fibra com botões grandes.
- C · a bandeja como a física, posições numeradas.
- **Escolhida: mistura de A e C** (desenho "v2"): a bandeja (C) é a visão principal; ao tocar numa
  posição vazia, abre a escolha com os dois cabos lado a lado (A). Uma variante com o cabo
  desenhado como corte redondo foi mostrada e **rejeitada** pelo dono — o cabo aparece como uma
  barra com as listras de cor dos tubos.

## O desenho

### Entrada e saída

- Na ficha da caixa, a seção "Bandejas e fusões" passa a mostrar um resumo ("5 fusões em 2
  bandejas") e um botão **"Ver fusões"** que navega para `/caixas/:boxId/fusoes`. A lista de
  fusões em texto e o diálogo "Nova fusão" saem da ficha (a tela nova os substitui). Criar e
  excluir bandeja também passam para a tela nova.
- Cabeçalho da página: voltar, nome da caixa, tipo (CTO/CEO/DIO) e situação.
- **Voltar** leva ao mapa com a caixa selecionada e a ficha aberta, na mesma posição/zoom em que o
  mapa estava. (Decisão minha: um serviço `root` em memória guarda centro, zoom e a chave
  selecionada ao sair do mapa; ao abrir pelo link direto, voltar abre o mapa centrado na caixa.)
- Caixa inexistente ou erro ao carregar → mensagem com "Tentar novamente" e "Voltar ao mapa".

### Faixa de cabos (topo)

- Uma barra por cabo da caixa: nome, "chega aqui / sai daqui / passa por aqui" (de
  `attachmentRole`), quantidade de fibras e as listras de cor dos tubos.
- Tocar na barra **abre o cabo**: lista os tubos (com a cor) e, dentro de cada um, as fibras como
  círculos coloridos numerados; cada fibra diz "emendada na bandeja 1, posição 5" ou "livre nesta
  caixa". Tocar de novo fecha.
- Cabo sem tubos/fibras cadastrados → aviso "Este cabo ainda não tem tubos e fibras. Cadastre na
  ficha do cabo." com atalho.

### Bandeja (centro)

- Abas: "Bandeja 1 · 3/12", "Bandeja 2 · 0/24"… e "+ bandeja" (escolhe a capacidade, mesmas
  opções de hoje). Bandeja vazia mostra "Excluir bandeja".
- O corpo lista **todas as posições de 1 até a capacidade**:
  - **Ocupada:** número · círculo da fibra que chega + "CABO-01 Verde·2" · protetor de emenda com a
    cor de cada lado · "CABO-02 Verde·3" + círculo da fibra que sai.
  - **Vazia:** "vazia"; com edição liberada, "+ emendar aqui".
- Sem bandeja → texto curto e botão para criar a primeira.

### Escolher as fibras (tocar numa posição vazia)

- Celular (largura < 900 px): painel que sobe por cima da parte de baixo da tela. Tela larga:
  painel fixo à direita da bandeja. (Decisão minha.)
- Título "Emenda na posição 6 · Bandeja 1". Duas colunas: **lado que chega** e **lado que sai**.
  Cada coluna tem um seletor de cabo em botões (os cabos da caixa; padrão: coluna 1 = primeiro cabo
  que "chega", coluna 2 = outro cabo) e os tubos do cabo, cada um com as fibras como círculos
  coloridos na ordem padrão (verde, amarelo, branco, azul…), com o número.
- Fibras cuja ponta não está livre aparecem **apagadas e não tocáveis**; tocar nelas mostra "já
  emendada na bandeja X, posição Y" quando for uma fusão desta caixa.
- A mesma fibra não pode ser escolhida dos dois lados. Os dois lados podem ser do mesmo cabo.
- Uma frase de ajuda acompanha cada passo ("Branco (fibra 3) do CABO-01 escolhida. Agora a fibra do
  CABO-02.").
- Campo opcional "Perda (dB)". Interruptor "Mostrar pontas (avançado)" mostra A/B de cada lado;
  sem ele, a ponta segue o papel do cabo (ver "Decisões tomadas depois da revisão").
- "Registrar emenda" envia `trayNumber`, `positionNumber`, as duas fibras e pontas e a perda. Ao
  dar certo, fecha o painel e a posição aparece preenchida. Erro (409, 400…) → mensagem traduzida no
  próprio painel, escolhas mantidas.

### Consultar uma emenda (tocar numa posição ocupada)

- Cartão com: "Posição 2 · Bandeja 1"; "Chega: CABO-01, tubo Verde, fibra Amarela (2)"; "Sai:
  CABO-02, tubo Verde, fibra Branca (3)"; perda, se houver.
- Ações: "Ver CABO-01 no mapa" / "Ver CABO-02 no mapa" (volta ao mapa com o cabo selecionado) e,
  com edição, "Excluir emenda" (com confirmação).

### Leitura sem edição

Com `canEdit` falso: sem "+ emendar", "+ bandeja" e "Excluir"; todo o resto (abrir cabo, tocar em
emenda) funciona.

## Partes da implementação já decididas

- Rota preguiçosa `caixas/:boxId/fusoes` em `app.routes.ts`, título "GeoFiber — Fusões".
- Componentes em `src/app/features/box-splices/`.
- Dados: reaproveitar `BoxSheetStore` (provido pela página nova), estendendo `addSplice` para
  aceitar `positionNumber`. Nada novo no repositório do mapa.
- Regras puras novas em `core/network/box-interior.ts` (ou arquivo irmão), com teste primeiro:
  posições da bandeja (todas, com a fusão de cada uma ou vazia), onde cada fibra está emendada
  nesta caixa, estado de uma fibra no seletor (disponível / em uso / escolhida) e as frases da
  consulta.
- Mapa: lê a chave selecionada e a posição guardadas ao voltar.
- Documentação: SPECS (módulo + regras de interface novas), GUIA ("Registrar fusões"), README,
  CLAUDE.md (situação) e o plano em `docs/superpowers/plans/`.

## Decisões tomadas depois da revisão (minhas; o dono pode mudar)

- **Ponta usada segue o papel do cabo nesta caixa.** A = início do cabo, B = fim. Cabo que
  "chega aqui" (`END`) usa a ponta B; cabo que "sai daqui" (`START`) usa a ponta A; cabo que "passa
  por aqui" (`PASS_THROUGH`, sangria) usa B no lado que chega e A no lado que sai (os padrões do
  backend). A disponibilidade de cada fibra é calculada com essa ponta, e a ponta é sempre enviada
  explícita no `POST`. O modo avançado deixa trocar.
- **Depois de registrar, a tela recarrega** (overview + fibras, como o resto do app), mas **sem
  apagar o que está na tela**: mostra uma barra de progresso fina e mantém a bandeja visível. Se no
  uso real ficar lento, a atualização local vira uma melhoria separada.
- **Por que uma fibra está apagada**, conforme `FiberEndLinkResponse.type` da ponta usada:
  fusão nesta caixa → "já emendada na bandeja X, posição Y"; fusão em outra caixa → "emendada em
  outra caixa"; conector → "ligada por conector"; splitter → "ligada a um splitter"; porta de
  atendimento → "ligada a uma porta de atendimento"; porta PON → "ligada à OLT"; situação rompida
  ou reservada → "rompida" / "reservada". No "abrir cabo", "livre nesta caixa" quer dizer que a
  ponta usada nesta caixa está livre.
- **Fusões antigas sem posição ou acima da capacidade** (de antes da mudança no backend) aparecem
  numa faixa "Sem posição definida" abaixo da bandeja, com "Excluir" para refazer na posição certa.
- **CTO sem bandeja** também mostra o botão "Ver fusões" (para poder criar a primeira bandeja).

## O que fica para quem implementar

Nomes de componentes e divisão interna, CSS exato (tamanhos dos círculos ≥ 24 px de toque, cores
do `optical-catalog`, tema escuro), ícones, animação do painel, e como o serviço de memória do mapa
se liga ao `geo-map`.
