# GeoFiber — Guia de uso

Este guia é para quem usa o GeoFiber, seja você **técnico** documentando a rede ou alguém que só
quer **entender** o que está no mapa. As regras técnicas ficam na [especificação](SPECS.md).

## O que é o GeoFiber

Uma rede FTTH (*fiber to the home*, fibra até a casa) leva internet por fibra óptica desde a
central da operadora até cada cliente. O GeoFiber mostra essa rede no mapa e registra o que existe
em cada ponto: por onde passa cada cabo, o que tem dentro de cada caixa e qual cliente está ligado
em qual porta.

## Entrar e sair

- **Entrar:** abra o GeoFiber, informe seu e-mail e senha e toque em **Entrar**. Se você abriu um link
  (ex.: as fusões de uma caixa), o sistema leva para ele depois de entrar.
- **Continuar conectado:** você não precisa entrar de novo a cada vez que abre o sistema; a sessão se
  renova sozinha. Ela termina quando você sai, depois de 14 dias sem uso, ou se o administrador
  desativar sua conta ou trocar sua senha.
- **"Sua sessão expirou. Entre novamente.":** entre de novo; o sistema volta para a tela em que você
  estava. O que estava sendo digitado e não foi salvo se perde.
- **"Não foi possível conectar ao servidor do GeoFiber.":** o servidor não respondeu. Confira a
  internet e toque em **Tentar novamente**. Isso não encerra a sua sessão.
- **"Muitas tentativas de entrar.":** depois de 5 senhas erradas seguidas, o sistema espera 15
  minutos antes de aceitar esse e-mail de novo. Se esqueceu a senha, peça ao administrador para
  trocá-la.
- **Sair:** no mapa, toque no ícone de pessoa (**Conta**), no pé da barra de ferramentas, e em **Sair**.
  O menu também mostra seu papel: **Técnico** (opera a rede) ou **Administrador** (opera a rede e
  cuida das contas).

## Gerenciar usuários (administrador)

No painel lateral do mapa, toque em **Usuários** (abaixo de **Importar KMZ/KML**): aparece a lista de todas as contas, com o papel e a situação
(**Ativa** ou **Desativada**). A sua conta aparece com "(você)".

- **Alguém entrou na equipe:** toque em **Cadastrar**, informe nome, e-mail, uma senha com pelo menos
  10 caracteres e o papel. Passe a senha à pessoa por um meio seguro.
- **Um técnico saiu da equipe:** toque em **Desativar** na linha dele e confirme. Ele sai do sistema em
  até 15 minutos e não consegue entrar de novo. O que ele cadastrou continua na rede. Se ele voltar,
  toque em **Reativar**. Você não pode desativar a sua própria conta.
- **Alguém esqueceu a senha:** toque em **Trocar senha** na linha da pessoa, defina uma senha
  temporária (pelo menos 10 caracteres) e passe para ela. As sessões abertas dela são encerradas e
  ela entra com a senha nova. Se trocar a sua própria senha, o sistema pede para você entrar de novo.
- **"Só o criador pode alterar este elemento.":** cada caixa, cabo, OLT e cliente pertence a quem o
  cadastrou. Todos veem tudo, mas só o dono altera ou exclui — nem o administrador altera o que é de
  outra pessoa. O que você digitou continua no formulário; peça a alteração ao dono.

## Como usar o mapa

Tudo o que aparece no mapa vem do servidor e fica salvo nele: recarregar a página não perde nada.

- **Ver um item:** clique num marcador ou num cabo. Um balão mostra o nome, o tipo, a situação e
  os detalhes. No cabo, o balão também diz **de onde para onde** ele vai (ex.: "De OLT-CENTRO para
  CEO-01"). Para editar, toque no botão **"Toque aqui para editar"** do balão (ou clique de novo no
  mesmo item).
- **Adicionar elemento:** na barra da esquerda, escolha "Adicionar elemento", o tipo (OLT, CTO,
  CEO ou DIO) e clique no mapa. Preencha o formulário e salve. Depois de escolher o tipo, a janela
  de escolha fecha e aparece no alto do mapa a faixa **"Criar CTO"**: toque nela para trocar o tipo,
  ou no X para parar de criar. Ao entrar na criação, o item que estava selecionado deixa de estar e a
  ficha dele fecha.
- **Traçar cabo:** escolha "Traçar cabo" e a função (Backbone, Alimentação...). Clique no mapa para
  marcar o caminho; **clique numa OLT ou caixa** para começar ou terminar nela. Termine com duplo
  clique. O formulário já vem com "Começa em …" e "Termina em …" marcados; o início e o fim só são
  gravados com os dois marcados.
- **Mover:** "Mover elemento" deixa arrastar OLTs e caixas; "Mover cabo" deixa arrastar os pontos
  do cabo clicado. A posição é salva ao soltar; se o servidor recusar, o item volta para onde
  estava.
- **Excluir:** na ficha da caixa, da OLT ou do cabo, toque em **⋮ (Mais ações) → Excluir** (ou use a
  lixeira do item na legenda). O sistema sempre pede confirmação. O servidor pode recusar (ex.:
  caixa que ainda tem cabos) e a mensagem explica o motivo.
- **Painel lateral:** começa recolhido, para o mapa ter mais espaço. A seta abre o painel; os ícones
  dão acesso direto a Modelos, Importar e (para administrador) Usuários. No celular, o painel é só
  o botão ☰ no canto de cima. Toque nele para abrir e toque fora para fechar.
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
- **Zoom bem perto:** nos zooms mais altos o fundo fica um pouco borrado, porque o mapa amplia a
  última imagem disponível. É normal: os elementos e cabos continuam no lugar certo.

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
- No celular (ou janela estreita), a ficha vira uma gaveta que sobe da parte de baixo da tela. Ela
  abre baixa (cerca de um terço da tela) para o item continuar à vista no mapa. Arraste a **alça**
  (o tracinho no alto da gaveta) para cima para ver mais, quase até o alto da tela, ou para baixo para
  diminuir. Se arrastar até quase o fim, a ficha fecha. Com a ficha aberta, os botões "O que estou
  vendo?" e "Glossário" saem da frente; eles voltam ao fechar a ficha.

### Ficha do cabo

Ao clicar num cabo, abre à direita a **ficha do cabo**, com as abas **Resumo** e **Fibras**:

- No alto, uma frase diz **de onde o cabo sai, por onde passa e onde termina** (ex.: "Este cabo sai
  de OLT-CENTRO, passa por CTO-01 e termina em CEO-01"). As caixas e OLTs do cabo ganham um anel
  no mapa.
- **Por onde o cabo passa:** clique em "Editar lista" para montar o caminho. Adicione pelo seletor
  ou com **"Escolher no mapa"** (cada OLT/caixa clicada entra no fim da lista). Use as setas para
  ordenar: o primeiro é o início e o último é o fim. Salve com "Salvar lista". Enquanto escolhe no
  mapa, clicar em outro cabo não abre a ficha dele (para não perder a lista): salve ou cancele antes.
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

### Registrar fusões (diagrama de fusões)

O diagrama de fusões mostra, para cada fibra da caixa, para onde ela vai. Ele tem endereço próprio
(ex.: `/caixas/…/fusoes`): dá para mandar o link para outro técnico ou para o atendimento.

- **Uma aba por cabo:** "CABO-01 · chega aqui", "BACKBONE · passa por aqui", "DROP · sai daqui" e,
  se a caixa tiver, "Splitters". A tela abre no primeiro cabo que chega.
- **Cada fibra numa linha:** a bolinha com a cor, o número e o destino em poucas palavras:
  "→ BACKBONE · Verde 1" (emendada), "→ Splitter 1:8", "→ porta 3 · Maria", "passa direto",
  "livre", "rompida", "em outra caixa". Em cabos com vários tubos, cada tubo tem um título com a
  cor e quantas fibras estão em uso ("1/12 em uso"); toque nele para recolher.
- **Toque numa fibra** para abrir o desenho só daquela ligação: de onde chega, o que tem no meio e
  para onde vai. Numa emenda dá para ver a posição e a bandeja, ver cada cabo no mapa, **Ver o
  caminho** da fibra no mapa ou **Excluir emenda**. No splitter aparecem a entrada e as saídas, com o
  cliente de cada uma.
- **Para emendar:** toque numa fibra livre e em **Emendar**. Aparece o aviso "Escolha a fibra que vai
  emendar com …" e a lista abre no cabo do outro lado. Fibras já em uso ficam apagadas, com o motivo.
  Toque na segunda fibra, confira o desenho e a frase ("Vai para a bandeja 1, na próxima posição
  livre." ou "Vou criar a bandeja 2 (12 posições).") e toque em **Emendar**. Para desistir, **Cancelar**.
  Você não precisa escolher bandeja nem posição: o sistema faz isso.
- **Bandejas:** o rodapé mostra cada bandeja com a ocupação ("Bandeja 1 · 3/12"). Uma bandeja vazia
  tem **Excluir**. Quando a caixa já tem o máximo de bandejas, o diagrama avisa e não emenda.
- **Voltar** leva ao mapa com a caixa selecionada, no mesmo lugar em que você estava.

No celular, o desenho sobe por baixo da tela (até 60% da altura); no computador ele fica à direita
da lista.

### Importar a rede de um KMZ ou KML

Use quando a rede já está desenhada em outro sistema (OZMap, Google Earth). Abra **Importar KMZ/KML**
no painel lateral.

1. **Escolha o arquivo** (.kmz ou .kml), arrastando ou pelo botão.
2. **Veja os grupos.** Itens com o mesmo ícone e pasta ficam juntos. Cada grupo mostra quantos itens
   tem, quantos são novos e quantos já existem, e alguns nomes. Se a pasta ou os nomes começam com
   CTO, CEO, DIO ou OLT, o tipo já vem sugerido: confira.
3. **Escolha o que cada grupo vira.** Pontos: CTO, CEO, DIO, OLT ou Ignorar. Linhas: Backbone,
   Alimentação, Distribuição, Drop, Interconexão ou Ignorar; para cabos, informe quantas fibras
   têm. Enquanto algum grupo estiver sem escolha, o botão Importar fica desligado.
4. **Ajuste item a item, se precisar.** Toque em **Abrir** no grupo: troque o tipo de um item ou
   mande ignorá-lo.
5. **Confira no mapa.** A prévia mostra o que será criado. "Ver no mapa" leva ao mapa já enquadrando
   a importação.
6. **Importe.** Tudo é gravado de uma vez. Se der erro, nada é gravado.

Itens que já existem não são mexidos. Se um elemento existe mas mudou de lugar, aparece a opção
**Atualizar posição** no item; por padrão ela fica desligada. Importar de novo não duplica, e nada é
apagado porque sumiu do arquivo.

As pontas dos cabos novos são ligadas à caixa ou OLT mais próxima (até 15 m). Fusões e fibras
continuam sendo registradas na tela de fusões.

### Rastrear o caminho da fibra

Para saber por onde o sinal passa, toque no ícone de rota (**Rastrear**):

- na **caixa**, no cabeçalho: mostra o caminho desta caixa;
- num **splitter**, na lista de splitters da caixa: mostra o caminho desse splitter;
- numa **fibra**, dentro da ficha do cabo (abra o tubo): mostra o caminho dessa fibra;
- numa **emenda**, na tela de fusões ("Rastrear esta emenda"): volta ao mapa com o caminho dela.
- numa **porta PON** da OLT, na aba Portas: o ícone de rota mostra o caminho do sinal que sai daquela
  porta, até os clientes.

A ficha **Por onde passa o sinal** mostra:

- **Até a OLT**: de onde vem o sinal.
- **Até os clientes**: para onde o sinal vai.
- **Caminho**: os passos em ordem, com a fibra (cor e tubo) em cada cabo. No mapa, o caminho aparece na **cor da própria fibra** (amarelo, verde, etc.), com contorno escuro, e o resto do mapa fica mais claro.
- **Onde para**: se o caminho para em algum ponto, aparece a frase do motivo. No mapa, esse ponto
  tem um marcador vermelho; toque nele para ver a frase.
- **Saídas** (só no splitter, até os clientes): quantas saídas têm cliente e quantas estão livres.
  "Ver clientes desta saída" abre a saída; "Voltar" volta.

**Voltar** aparece sempre que o rastreio veio de outro item: se você abriu uma saída de splitter, volta
para o rastreio anterior; se não, fecha o rastreio e reabre o cabo, a caixa ou a OLT de onde você saiu.

Uma ficha por vez: ao abrir o rastreio, a ficha do cabo, da caixa ou da OLT fecha, e o contrário
também vale.

### Ver o impacto de uma manutenção

Antes de mexer num equipamento, toque no ícone de alerta (**Ver impacto de manutenção**) na ficha do
cabo, da caixa ou da OLT. A ficha **Impacto de manutenção** mostra:

- o resumo: "Se este cabo sair, 12 clientes ficam sem sinal, em 3 caixas.";
- as contagens: clientes, caixas e OLTs que dependem do item;
- a lista de clientes agrupada por caixa. Toque numa caixa para ver onde ela fica no mapa.

No mapa, o cabo aparece em roxo e as caixas, clientes e OLTs afetados aparecem como marcadores. Se
a lista for longa (mais de 2000 clientes), a ficha avisa, e o total continua o real.

Só o caminho gravado conta: se existir outra ligação que não esteja cadastrada, ela não aparece aqui.

### Portas PON da OLT

Ao clicar numa OLT, abre a **ficha da OLT**: quantas portas PON existem, quantas estão em uso e os
cabos que saem dela (clique para abrir a ficha do cabo). Abas: **Resumo** e **Portas PON** (cada
placa mostra quantas portas estão ocupadas, ex.: "6/8 ocupadas").

- **Adicionar portas:** escolha a placa e quantas portas (1, 4, 8 ou 16). A numeração continua de
  onde a placa parou. Enquanto cria, a ficha mostra "Criando porta 3 de 16…".
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

- **O que estou vendo?** (botão no canto inferior esquerdo do mapa): diz em uma frase o que está na tela ("Você está vendo
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
