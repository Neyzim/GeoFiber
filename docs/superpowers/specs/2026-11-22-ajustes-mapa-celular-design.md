# Ajustes do mapa: excluir pela ficha e uso no celular — design curto

**Data:** 2026-11-22 · **Pedido do dono** depois da conferência no navegador. Aprovado ("A, pode
seguir com suas escolhas").

## Por quê

No celular a ficha cobre o elemento, a ajuda fica por cima da ficha, a escolha de tipo esconde o mapa
e "clique novamente para editar" é difícil de acertar. Além disso, não havia como excluir caixa, OLT ou
cabo pela ficha, só pela Legenda.

## O que muda

1. **Excluir pela ficha (escolha A).** Fichas da caixa, da OLT e do cabo ganham um menu ⋮ no topo
   (só com `canEdit`) com "Excluir". A página pede confirmação (o mesmo `confirmDelete` da Legenda) e,
   depois do sucesso, a ficha some porque o item sai da rede. O cliente continua excluindo pela própria
   ficha.
2. **Painel lateral começa recolhido**, sempre (sem lembrar a escolha).
3. **Ajuda some com ficha aberta no celular.** "O que estou vendo?" e "Glossário" ficam escondidos
   abaixo de 900px enquanto houver qualquer ficha aberta (elemento, cabo, rastreio, impacto). No
   computador continuam visíveis.
4. **"Toque aqui para editar".** O balão do elemento e do cabo troca o texto "Clique novamente para
   editar" por um botão "Toque aqui para editar" (`data-popup-action="edit"`). O `app-geo-map` emite
   `popupEdit` e a página abre a edição do que está selecionado. Tocar de novo no elemento continua
   abrindo a edição.
5. **Elemento visível acima da gaveta.** No celular, ao focar um elemento, o mapa o centraliza na parte
   visível acima da ficha (`MapViewport.focus(point, zoom, bottomInset)`: desloca o centro metade da
   altura da gaveta).
6. **Gaveta arrastável no celular.** Abaixo de 900px a ficha abre com **35%** da altura da tela, tem uma
   alça no topo e pode ser arrastada livremente até **90%** (revisão do dono; antes 50%). Soltar abaixo de **20%** fecha a ficha (o que tira a
   seleção). Regra pura em `core/network/sheet-drag.ts`; diretiva `appSheetDrag` em `shared/common/`
   aplicada às seis fichas (caixa, OLT, cabo, cliente, rastreio, impacto).
7. **Criar sem tapar o mapa.** Ao escolher o tipo, a janela de escolha fecha e aparece uma faixa no topo
   "Criar CTO" (cabo: "Criar cabo de distribuição"), com X para encerrar a criação; tocar na faixa
   reabre a escolha. Componente `app-create-banner` em `shared/map/`.
8. **Criar tira a seleção** (revisão do dono): entrar em "Adicionar elemento" ou "Traçar cabo"
   desseleciona tudo (`state.select(null)` em `setTool`) e a ficha aberta fecha.

## Abordagens

- Excluir: **A) menu ⋮ na ficha** (escolhido: perto de onde a pessoa está, longe de toque acidental,
  igual ao cliente) · B) botão no rodapé de "Editar dados" (mistura editar e apagar).
- Gaveta: **diretiva com regra pura** (escolhido: um código para as seis fichas, testável) · CDK
  BottomSheet (exigiria refazer as fichas como diálogos).
- Faixa de criação: **componente próprio** (escolhido) · reaproveitar o aviso (snackbar), que some sozinho.

## Fora do escopo

Lembrar a altura da gaveta; mudar o computador além do item 4; arrastar com o teclado.

## Decisões minhas (revisar se incomodar)

Ajuda só some no celular; gaveta 35%/90%/20%; faixa de criação também para cabo; menu ⋮ só com
"Excluir".
