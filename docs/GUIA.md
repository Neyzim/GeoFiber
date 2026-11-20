# GeoFiber — Guia de uso

Este guia é para quem usa o GeoFiber, seja você **técnico** documentando a rede ou alguém que só
quer **entender** o que está no mapa. As regras técnicas ficam na [especificação](SPECS.md).

## O que é o GeoFiber

Uma rede FTTH (*fiber to the home*, fibra até a casa) leva internet por fibra óptica desde a
central da operadora até cada cliente. O GeoFiber mostra essa rede no mapa e registra o que existe
em cada ponto: por onde passa cada cabo, o que tem dentro de cada caixa e qual cliente está ligado
em qual porta.

## Como usar o mapa

Tudo o que aparece no mapa vem do servidor e fica salvo nele: recarregar a página não perde nada.

- **Ver um item:** clique num marcador ou num cabo. Um balão mostra o nome, o tipo, a situação e
  os detalhes. No cabo, o balão também diz **de onde para onde** ele vai (ex.: "De OLT-CENTRO para
  CEO-01"). Clique de novo no mesmo item para editar.
- **Adicionar elemento:** na barra da esquerda, escolha "Adicionar elemento", o tipo (OLT, CTO,
  CEO ou DIO) e clique no mapa. Preencha o formulário e salve.
- **Traçar cabo:** escolha "Traçar cabo" e a função (Backbone, Alimentação...). Clique no mapa para
  marcar o caminho; **clique numa OLT ou caixa** para começar ou terminar nela. Termine com duplo
  clique. O formulário já vem com "Começa em …" e "Termina em …" marcados; o início e o fim só são
  gravados com os dois marcados.
- **Mover:** "Mover elemento" deixa arrastar OLTs e caixas; "Mover cabo" deixa arrastar os pontos
  do cabo clicado. A posição é salva ao soltar; se o servidor recusar, o item volta para onde
  estava.
- **Excluir:** na legenda, use o ícone de lixeira do item. O servidor pode recusar (ex.: caixa que
  ainda tem cabos) e a mensagem explica o motivo.
- **Legenda:** busque pelo nome, filtre pela situação e use o olho para esconder um tipo do mapa.
- **Muitos itens juntos:** com o mapa afastado, marcadores próximos viram um círculo com o número
  de itens. Aproxime (ou clique no círculo) para vê-los separados.
- **Modelos:** atalhos que preenchem o formulário (ex.: "CTO 1x8", "Alimentação 12 fibras").
  Editar um modelo não muda o que já está no mapa.
- **Clientes** aparecem no mapa em verde, por enquanto só para consulta.
- **Foco:** ao selecionar um item, o resto do mapa fica mais apagado para o item escolhido se
  destacar. Os elementos do cabo aberto continuam normais.
- **Tema claro/escuro:** o tema muda só os painéis, fichas e janelas. O mapa continua o mesmo
  (ruas ou satélite, à sua escolha no seletor de mapas).

### Como ler as fichas

Toda ficha (cabo, caixa, OLT e cliente) abre com **uma linha só** no alto:

- **À esquerda, o que chega; no meio, o item; à direita, o que sai.** Numa caixa, por exemplo,
  "CABO-01 → CTO-05 → CABO-03" quer dizer que o CABO-01 traz o sinal e o CABO-03 leva adiante. Se
  houver muitos, aparecem 3 e um "+2".
- **A forma da linha diz a situação** (a cor só reforça):

  | Linha | Quer dizer |
  |---|---|
  | cheia | funcionando (instalado ou ativo) |
  | tracejada (– – –) | planejado, ainda não existe na rua |
  | traço longo (—— ——) | reservado ou bloqueado |
  | pontilhada (· · ·) | desativado ou cancelado |
  | traço e ponto (—·—·) | danificado ou rompido |

- **Abas:** logo abaixo da linha. A ficha sempre abre no **Resumo**; só a parte de baixo rola, as
  abas ficam sempre à vista.
- **"3/12":** é sempre **ocupado/total** — "3/12 posições" é uma bandeja com 3 emendas e espaço para
  12; "6/8 ocupadas" são 6 portas em uso de 8.
- **Bolinhas coloridas** são fibras e tubos nas cores da norma, sempre com o número por cima. Passe
  o mouse para ver o nome ("Fibra 3 · Branco").
- No celular (ou janela estreita), a ficha vira uma gaveta que sobe da parte de baixo da tela.

### Ficha do cabo

Ao clicar num cabo, abre à direita a **ficha do cabo**, com as abas **Resumo** e **Fibras**:

- No alto, uma frase diz **de onde o cabo sai, por onde passa e onde termina** (ex.: "Este cabo sai
  de OLT-CENTRO, passa por CTO-01 e termina em CEO-01"). As caixas e OLTs do cabo ganham um anel
  no mapa.
- **Por onde o cabo passa:** clique em "Editar lista" para montar o caminho. Adicione pelo seletor
  ou com **"Escolher no mapa"** (cada OLT/caixa clicada entra no fim da lista). Use as setas para
  ordenar: o primeiro é o início e o último é o fim. Salve com "Salvar lista".
- **Tubos e fibras:** num cabo novo, escolha quantas fibras vão em cada tubo e clique em "Criar
  tubos e fibras"; o sistema cria tudo de uma vez, nas cores da norma. Abra um tubo para ver as
  fibras: número no tubo e no cabo, cor, situação e o que está ligado em cada ponta. Pelo menu ⋮
  dá para marcar uma fibra livre como **rompida** ou **reservada** (e voltar a disponível).

### Dentro da caixa

Ao clicar numa caixa (CTO, CEO ou DIO), abre à direita a **ficha da caixa**. No alto, uma frase
resume o que há nela (ex.: "Esta caixa recebe 2 cabos. Tem 1 splitter e 8 portas de atendimento
(3 com cliente).").

Abas: na **CEO** e no **DIO**, Resumo · Fusões · Splitters; na **CTO**, Resumo · Portas (e Fusões,
se a caixa tiver bandeja ou conector). Em Fusões, cada conector aparece como uma linha: a fibra de
um lado à esquerda, a fibra do outro lado à direita.

- **Cabos nesta caixa:** clique num cabo para abrir a ficha dele.
- **Fusões:** a ficha mostra quantas fusões e bandejas existem (ex.: "5 fusões em 2 bandejas") e o
  botão **Ver fusões**, que abre a tela de fusões (veja abaixo). Toda caixa tem o botão no Resumo,
  inclusive a CTO sem bandeja.
- **Conectores:** ligações removíveis entre duas fibras (comuns no DIO).
- **Splitters:** dividem o sinal de uma fibra em várias saídas. Escolha a divisão (1:2 a 1:64) e
  ligue a fibra de entrada. Numa CTO, o splitter já cria uma porta de atendimento para cada saída.
- **Portas de atendimento** (CTO): onde o cliente é conectado. Cada porta mostra de onde vem o
  sinal e qual cliente usa. Pelo menu ⋮ dá para trocar a origem ou excluir a porta.

As pontas da fibra (A e B) ficam escondidas; o padrão serve na maioria dos casos. Quem precisar
pode ligar "Mostrar pontas (avançado)" no diálogo.

### Registrar fusões

A tela de fusões imita a caixa aberta na sua frente. Ela tem endereço próprio (ex.:
`/caixas/…/fusoes`): dá para mandar o link para outro técnico ou para o atendimento.

- **No alto, os cabos da caixa:** cada barra mostra o nome do cabo, se ele chega, sai ou passa por
  aqui, quantas fibras tem e as cores dos tubos. Toque na barra para **abrir o cabo**: aparecem os
  tubos e cada fibra com a cor, o número e onde está emendada ("emendada na bandeja 1, posição 5"
  ou "livre nesta caixa"). Toque de novo para fechar.
- **No centro, a bandeja:** uma aba por bandeja ("Bandeja 1 · 3/12") e todas as posições, de 1 até a
  última, como na bandeja de verdade. Posição ocupada mostra a fibra que chega, o protetor de emenda
  com as duas cores e a fibra que sai. Posição livre mostra **+ emendar aqui**.
- **Para emendar:** toque numa posição livre. Abre o painel "Emenda na posição 6 · Bandeja 1" com
  duas colunas: **lado que chega** e **lado que sai**. Em cada uma, escolha o cabo e toque na fibra
  pela cor. Fibras apagadas já estão em uso; toque nelas para saber onde ("já emendada na bandeja 1,
  posição 2", "ligada a um splitter"…). A frase no alto do painel diz o próximo passo. Se quiser,
  informe a perda (dB) e toque em **Registrar emenda**.
- **Para consultar:** toque numa posição ocupada para ver de onde a fibra chega, para onde sai e a
  perda. Dali dá para ver cada cabo no mapa ou **excluir a emenda** (para corrigir, exclua e
  registre de novo).
- **Bandejas:** "+ bandeja" cria uma bandeja (escolha quantas posições ela tem). Uma bandeja vazia
  mostra **Excluir bandeja**.
- **Sem posição definida:** emendas registradas antes da posição exata aparecem numa faixa abaixo
  da bandeja. Exclua e registre de novo na posição certa.
- **Voltar** leva ao mapa com a caixa selecionada, no mesmo lugar em que você estava.

No celular, o painel de emenda sobe por cima da parte de baixo da tela; no computador ele fica à
direita da bandeja.

### Portas PON da OLT

Ao clicar numa OLT, abre a **ficha da OLT**: quantas portas PON existem, quantas estão em uso e os
cabos que saem dela (clique para abrir a ficha do cabo). Abas: **Resumo** e **Portas PON** (cada
placa mostra quantas portas estão ocupadas, ex.: "6/8 ocupadas").

- **Adicionar portas:** escolha a placa e quantas portas (1, 4, 8 ou 16). A numeração continua de
  onde a placa parou.
- Pelo menu ⋮ de cada porta: **Ligar fibra** (a fibra do cabo que leva o sinal para a rede),
  **Desligar fibra**, marcar como **reservada** ou **com defeito**, ou **excluir** (só sem fibra).

### Clientes

- **Cadastrar:** "Adicionar elemento" → **Cliente** e clique no mapa onde o cliente mora. Preencha
  nome e código do contrato, escolha a **CTO** (as mais próximas aparecem primeiro, com a distância)
  e uma **porta de atendimento**. Só dá para escolher portas livres e com sinal; as outras aparecem
  apagadas com o motivo.
- **Ficha do cliente:** ao clicar num cliente, a ficha diz quem o atende ("Atendido pela CTO-01,
  porta 3"), o que a situação significa e o histórico de mudanças. Abas: **Resumo** e **Histórico**;
  na linha do alto, a CTO e a porta que atendem o cliente ficam à esquerda (ele é o ponto final).
- **Situações:** **Ativo** (recebe o serviço), **Bloqueado** (serviço suspenso, porta continua com
  ele), **Cancelado** (contrato encerrado, a porta é liberada). Para reativar um cancelado, escolha
  de novo uma porta.
- **Excluir cadastro** é só para cadastro feito por engano; para encerrar o contrato, use Cancelar.

### Ajuda dentro do sistema

- **O que estou vendo?** (botão no mapa): diz em uma frase o que está na tela ("Você está vendo
  1 OLT, 3 CTOs e 12 clientes, ligados por 5 cabos"), avisa se algum filtro esconde parte da rede e
  explica as cores dos pontos e das linhas.
- **Glossário:** procure qualquer palavra (OLT, splitter, fusão, porta PON…); não precisa de acento.
- **"?" nas fichas:** passe o mouse para ver o significado; clique para abrir o glossário.

### Cores e linhas dos cabos

- A **cor** diz a função: Backbone azul-escuro, Alimentação vermelho, Distribuição verde-azulado,
  Drop amarelo, Interconexão marrom. Linhas mais grossas são cabos mais importantes.
- A **linha** diz a situação: **tracejada** = planejado (ainda não existe na rua); **contínua** =
  instalado ou ativo; **vermelha pontilhada** = danificado; **cinza clara** = desativado.
- Nas fichas, a linha do alto e os diagramas usam as formas de "Como ler as fichas".

### "Não foi possível carregar a rede"

Essa faixa aparece quando o servidor do GeoFiber não respondeu. Confira se ele está ligado (ou
peça a quem cuida dele) e clique em **Tentar novamente**. Enquanto a rede não carrega, as
ferramentas de edição ficam desligadas.

## Glossário

O caminho do sinal, em resumo: **OLT → cabos → caixas de emenda → caixa de atendimento → cliente**.

### Equipamentos e caixas

| Termo | O que é |
|---|---|
| **OLT** | Equipamento na central da operadora de onde sai o sinal. É o começo da rede. |
| **Porta PON** | Cada saída da OLT. Uma porta PON atende muitos clientes, porque o sinal é dividido no caminho. |
| **CEO** (Caixa de Emenda Óptica) | Caixa na rua onde cabos são emendados uns nos outros. |
| **CTO** (Caixa de Terminação Óptica) | Caixa perto das casas, de onde sai o cabo de cada cliente. |
| **DIO** (Distribuidor Interno Óptico) | Painel, normalmente na central, onde as fibras são organizadas e ligadas por conectores. |

### Cabos e fibras

| Termo | O que é |
|---|---|
| **Cabo** | Conjunto de fibras protegido por uma capa, desenhado no mapa como uma linha. |
| **Backbone** | Cabo troncal, o principal da rede. |
| **Alimentação** (*feeder*) | Cabo que leva o sinal da central até as caixas de emenda. |
| **Distribuição** | Cabo que leva o sinal das caixas de emenda até as caixas de atendimento (CTO). |
| **Drop** | Cabo fino que vai da CTO até a casa do cliente. |
| **Interconexão** | Cabo que liga dois pontos da própria rede (ex.: entre centrais). |
| **Tubo loose** | Tubo dentro do cabo que agrupa as fibras (normalmente 12 por tubo). |
| **Fibra** | O fio de vidro por onde passa a luz. Cada uma é numerada no tubo e no cabo. |
| **Cores ABNT** | As 12 cores que identificam tubos e fibras, nesta ordem: verde, amarelo, branco, azul, vermelho, violeta, marrom, rosa, preto, cinza, laranja e turquesa. |
| **Ponta A / Ponta B** | Toda fibra tem duas pontas: a **A** fica do lado da OLT e a **B** do lado do cliente. |

### Dentro das caixas

| Termo | O que é |
|---|---|
| **Bandeja** | Suporte dentro da caixa onde ficam as emendas, cada uma numa posição. |
| **Fusão** (emenda) | União permanente de duas fibras, feita por solda com calor. |
| **Conector** | Ligação de duas fibras que pode ser desfeita (encaixe). |
| **Splitter** | Divisor que pega o sinal de uma fibra e reparte em várias saídas. |
| **Razão do splitter** | Em quantas saídas o sinal é dividido: 1:2, 1:4, 1:8, 1:16, 1:32 ou 1:64. |
| **Porta de atendimento** | Saída da CTO onde o drop de um cliente é conectado. |
| **Atenuação (dB)** | Quanto de sinal se perde numa emenda ou conexão. Quanto menor, melhor. |

### Situações (status)

| Onde | Situações |
|---|---|
| OLT, caixa e cabo | **Planejado** (ainda no projeto), **Instalado**, **Ativo** (em uso), **Danificado**, **Desativado**. |
| Fibra | **Disponível**, **Ocupada** (automático quando ligada), **Rompida**, **Reservada**. |
| Portas | **Livre**, **Ocupada** (automático), **Reservada**, **Com defeito**. |
| Cliente | **Ativo**; **Bloqueado** (serviço suspenso, continua na porta); **Cancelado** (a porta é liberada, mas o cadastro continua). |
