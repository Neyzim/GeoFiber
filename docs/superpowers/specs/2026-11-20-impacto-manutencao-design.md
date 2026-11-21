# Impacto de manutenção — design

Data: 2026-11-20 · Situação: **aprovado pelo dono e implementado no front** (plano em `docs/superpowers/plans/2026-11-20-impacto-manutencao.md`; não commitado).

## Intenção

Antes de mexer num equipamento (cabo, caixa ou OLT), a equipe precisa saber **quem fica sem
sinal**. Hoje isso exige rastrear cliente por cliente. O sistema responde numa tela: quais clientes,
caixas e OLTs dependem deste item, desenhados no mapa.

## Definição de "depende"

Um cliente **depende** de um item quando o caminho dele até a OLT (sentido `UPSTREAM` do rastreio)
passa por esse item. Se o item sai ou para, o cliente perde o sinal. **Sem rota alternativa**: vale
só o caminho gravado.

- **Cabo:** o caminho passa por um trecho do cabo.
- **Caixa:** o caminho passa pela caixa (fusão, conector, splitter ou porta dentro dela).
- **OLT:** o caminho termina nela (todos os clientes atendidos pelas portas PON dela).

Tudo usa só as ligações gravadas, como o rastreio. Nada por proximidade no mapa.

## Objetivos

1. Para um **cabo**, uma **caixa** ou uma **OLT**, listar os clientes que dependem dele, agrupados
   por caixa de atendimento.
2. Listar as **caixas** e as **OLTs** no caminho desses clientes.
3. Mostrar no mapa: o item em destaque, as caixas afetadas e os clientes afetados (marcadores).
4. Contar: "12 clientes, 3 caixas, 1 OLT".
5. Só leitura. Não grava nada, não avisa ninguém.

## Não-objetivos

- Impacto de **fibra** ou **fusão** isoladas: vêm depois, se a equipe pedir.
- Rota alternativa e redundância.
- Orçamento óptico e perda de sinal.
- Notificação a clientes e agenda de manutenção.

## Antianobjetivos

- Calcular impacto pelo mapa (cliente "perto" do cabo não depende dele).
- Mostrar só a contagem sem a lista: a equipe precisa dos nomes para avisar.

## Abordagens consideradas

- **A. Endpoint de impacto no backend — escolhida.** O backend percorre o caminho de cada cliente até
  a OLT e marca os que passam pelo item. A regra fica num lugar só, como o rastreio. Custo: um
  endpoint por tipo de item e consultas bem feitas, porque cada impacto percorre a rede.
- **B. Front com o rastreio existente.** Chamar o rastreio para cada fibra ou porta do item. Sem
  backend novo, mas o resultado vira soma de caminhos sem garantia de cobrir todos os clientes e pesa
  em rede grande. Descartada.
- **C. Impacto pré-calculado.** Tabela atualizada a cada ligação. Leitura instantânea, mas exige
  manter a tabela em toda escrita de fusão, porta, splitter e cabo. Não se justifica agora.

## Como é a resposta

Três endpoints com a mesma resposta: `GET /api/v1/impact/cables/{id}`, `/impact/boxes/{id}` e
`/impact/olts/{id}`.

```jsonc
{
  "target": { "kind": "BOX", "id": "uuid", "label": "CTO-001" },
  "totals": { "customers": 12, "boxes": 3, "olts": 1 },
  "boxes": [
    { "id": "uuid", "label": "CTO-002", "coordinates": [ {"longitude": -51.57, "latitude": -10.65} ],
      "customers": [ { "id": "uuid", "name": "Maria", "coordinates": [ ... ] } ] }
  ],
  "olts": [ { "id": "uuid", "label": "OLT-CENTRAL", "coordinates": [ ... ] } ],
  "truncated": false
}
```

- `customers` ficam agrupados pela caixa de atendimento, para a equipe visitar por caixa. O item
  alvo não aparece em `boxes` nem em `olts` (já está em `target`).
- Posição do cliente: a própria posição dele no mapa. Cliente sem posição fica na lista, não no mapa.
- Limite de **2000 clientes** por resposta. Passou disso, `truncated: true`; `totals` continua exato.
- `404` se o item não existe; `400` se o id não é um UUID.

## Como a tela mostra (no front)

- **Entrada:** botão "Ver impacto" na ficha do cabo, da caixa e da OLT, perto de "Rastrear".
- **Ficha "Impacto de manutenção":** frase de resumo ("Se este cabo sair, 12 clientes ficam sem
  sinal, em 3 caixas.") e a lista por caixa. Clicar numa caixa enquadra no mapa. Cliente sem nome
  aparece como "(sem nome)".
- **Mapa:** o item em destaque (traçado do cabo na cor da fibra, ou o marcador da caixa ou da OLT),
  caixas afetadas e clientes afetados como marcadores. Resto do mapa esmaece (mesmo foco do rastreio).
- Texto pt-BR simples. Sem código do backend na tela.

## Restrições

- Backend Spring, PostGIS, Flyway. Leitura: **sem migração de banco**.
- Front: Angular 22, TDD, docs junto. Tipos seguem o backend (`npm run api:types`).
- Regra do projeto: o que faltar no backend o dono implementa. O front não contorna.
- Só leitura: `canEdit` não se aplica.

## Divisão de trabalho

1. **Backend (dono):** os três endpoints, a regra de dependência, o limite de 2000 e testes de
   integração (cliente numa linha só, cliente com duas caixas no caminho, item sem clientes, item
   inexistente, OLT com clientes em duas placas).
2. **Front:** regras puras de montagem da lista e dos marcadores, store, ficha, botões e destaque no
   mapa. Começa depois que os endpoints existirem.

## O que fica para quem constrói

Nome exato das classes do backend, consulta de clientes por item, cor e tamanho dos marcadores de
cliente, textos exatos da frase de resumo.

## Decisões tomadas sem o dono (revisar)

- Cabo, caixa e OLT na primeira versão; fibra e fusão ficam para depois.
- Sem rota alternativa: o caminho gravado é o único.
- Limite de 2000 clientes com `truncated`.
- Agrupamento por caixa de atendimento, com a caixa também listada no mapa.
- Cliente sem posição não aparece no mapa, mas continua na lista.
