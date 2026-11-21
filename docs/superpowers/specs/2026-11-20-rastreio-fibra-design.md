# Rastreio da fibra — design

Data: 2026-11-20 · Situação: **aprovado pelo dono e implementado no front** (plano em `docs/superpowers/plans/2026-11-20-rastreio-fibra.md`; não commitado).

## Intenção

O GeoFiber quer vencer o OZMap pela clareza. O técnico precisa responder sozinho, olhando a tela:
"por onde este sinal passa?", "de onde esta CTO recebe?", "onde a rede está quebrada?". O rastreio
mostra o caminho completo, em ordem, desenhado no mapa e em lista. É também a base da análise de
impacto (próximo passo).

## Objetivos

1. Rastrear a partir de uma **fibra** (uma das pontas), de uma **caixa** (CTO, CEO, DIO), de um
   **splitter** ou de uma **fusão**.
2. Duas direções: **em direção à OLT** (de onde vem o sinal) e **em direção aos clientes** (para onde
   o sinal vai).
3. Mostrar o caminho em ordem: cada passo com nome, tipo e onde está (caixa, bandeja, posição, fibra
   com cor e número, porta).
4. Mostrar **pontos quebrados**: ponta sem ligação, fibra sem continuidade, porta sem sinal, sem
   cliente.
5. Splitter em direção aos clientes: **resumo com ramos abertos** ("8 saídas: 5 com cliente,
   3 livres"); cada saída abre a lista dos seus clientes, sob demanda.
6. Só leitura. Não grava nada.

## Não-objetivos

- Análise de impacto e orçamento óptico (vêm depois, usam o mesmo rastreio).
- Rastreio de ponta a ponta entre OLTs diferentes ou entre cidades.
- Recalcular atenuação por trecho (fica para o orçamento óptico).

## Antianobjetivos

- Inferir continuidade pela proximidade no mapa. A continuidade vem **só** das ligações gravadas
  (princípio da Fase 3 do roadmap).
- Montar o caminho no navegador a partir de muitas requisições.
- Lista completa de centenas de clientes de uma vez.

## Abordagens consideradas

- **A. Endpoint de travessia no backend — escolhida.** O backend percorre as ligações gravadas e
  devolve os passos, os ramos e os pontos quebrados. A regra fica num lugar só. Custo: um endpoint novo
  no backend, com limite de profundidade e proteção contra laço.
- **B. Travessia no front.** O navegador puxa fibras e ligações de cada cabo e caixa. Não exige backend
  novo, mas gera muitas requisições, fica lento em rede grande e a regra de continuidade fica
  duplicada. Descartada.
- **C. Caminho pré-calculado.** Uma tabela atualizada a cada ligação, leitura instantânea. Exige
  manter consistência em toda escrita de fusão, conector, porta e splitter, e migração de banco. Não
  se justifica agora. Descartada; reavaliar se a leitura ficar lenta.

## Modelo que o rastreio percorre (já existe)

Os nós são as **terminações** (cada ponta de fibra: A ou B). As arestas são:

1. **Trecho da fibra:** ponta A ↔ ponta B da mesma fibra (a fibra atravessa o cabo).
2. **Fusão ou conector na caixa:** ligação entre duas terminações (`OpticalConnection`, uma por par).
3. **Porta de splitter:** terminação ligada a uma porta de splitter. Dentro do splitter, a entrada
   leva a todas as saídas.
4. **Porta de atendimento:** porta de splitter ligada a uma porta de atendimento, que atende um cliente.
5. **Porta da OLT:** terminação ligada a uma porta PON.

Cada terminação tem no máximo uma ligação. Por isso o caminho é determinístico, exceto no splitter,
que se ramifica.

## Como é a resposta

`GET /api/v1/trace/{kind}/{id}?direction=UPSTREAM|DOWNSTREAM`, com `kind` em `FIBER_END`, `FIBER`, `BOX`,
`SPLITTER`, `SPLICE`. Para o `FIBER`, a ponta é a da própria fibra (A e B são percorridas as duas
direções conforme o sentido pedido).

```jsonc
{
  "start": { "kind": "BOX", "id": "uuid", "label": "CTO-001" },
  "direction": "UPSTREAM",
  "status": "REACHED_OLT",                 // REACHED_OLT | REACHED_CUSTOMERS | BROKEN | EMPTY
  "steps": [
    { "kind": "CABLE", "id": "uuid", "label": "CABO-DIST-01", "fiber": { "color": "AMARELO", "number": 2, "tube": "Verde" }, "coordinates": [ ... ] },
    { "kind": "BOX", "id": "uuid", "label": "CEO-01", "position": { "tray": 1, "number": 4 }, "coordinates": [ ... ] },
    { "kind": "CABLE", "id": "uuid", "label": "Tronco principal", "fiber": { ... }, "coordinates": [ ... ] },
    { "kind": "OLT_PORT", "id": "uuid", "label": "OLT-CENTRAL · placa 1 · porta 3" }
  ],
  "breaks": [
    { "reason": "NO_CONNECTION", "at": { "kind": "FIBER_END", "id": "uuid", "label": "CABO-DIST-02 · fibra 5 · ponta B" } }
  ],
  "branches": [                            // só em SPLITTER / DOWNSTREAM
    { "outputNumber": 1, "status": "CUSTOMERS", "customerCount": 4, "traceRef": "uuid-porta" },
    { "outputNumber": 2, "status": "FREE", "customerCount": 0 }
  ]
}
```

- `steps` vêm **na ordem do sinal**, do ponto inicial até o fim. Trechos de cabo carregam
  `coordinates` (para desenhar a linha no mapa); caixas e OLT carregam a posição.
- `breaks` são os pontos onde o caminho para. Motivos: `NO_CONNECTION` (ponta sem ligação),
  `NO_SIGNAL` (porta sem sinal), `NO_CUSTOMER` (porta de atendimento sem cliente), `LOOP` (laço
  detectado), `DEPTH_LIMIT` (passou do limite).
- `branches` (splitter, descendo): uma por saída, com `status` (`FREE`, `CUSTOMERS`, `BROKEN`) e
  contagem de clientes. Cada saída tem um `traceRef` para abrir o próprio rastreio sob demanda; não
  vem na mesma resposta. Assim a resposta fica pequena.
- Limite de profundidade de 50 passos. Passou disso, devolve `DEPTH_LIMIT` em `breaks`.
- Erro: `404` se o ponto inicial não existe; `400` para `kind` ou `direction` inválidos.

## Como a tela mostra (no front)

- **Entrada:** botão "Rastrear" na ficha da caixa, do cabo (por fibra), do splitter e na tela de
  fusões (na fusão).
- **Lista:** passos em ordem, cada um com nome, tipo e onde está. Pontos quebrados em destaque
  vermelho, com a frase do motivo em pt-BR ("Esta ponta não está ligada a nada.").
- **Mapa:** o caminho desenhado como linha grossa colorida por direção, enquadrando o caminho.
- **Mapa, pontos quebrados:** um marcador vermelho no lugar onde o caminho para (ponta sem ligação,
  porta sem sinal etc.), com o mesmo texto da lista ao tocar nele. Usa a posição do item quebrado; se
  ele não tiver coordenada (fibra ou porta dentro da caixa), o marcador vai na posição da caixa.
- **Splitter:** resumo com as saídas; tocar em uma saída abre os clientes dela (o `traceRef`).
- Textos pt-BR simples; sem código do backend na tela (`FREE`, `NO_SIGNAL` ficam para frases).

## Restrições

- Backend Spring, PostGIS, Flyway. A travessia é leitura: **sem migração de banco**.
- Front: Angular 22, TDD, docs junto (SPECS, GUIA, README, CLAUDE.md). Tipos seguem o backend
  (`npm run api:types` depois que o endpoint existir).
- Regra do projeto: o que faltar no backend o dono implementa lá. O front não contorna.
- Só leitura: `canEdit` não se aplica.

## Divisão de trabalho

1. **Backend (dono):** endpoint `GET /trace/{kind}/{id}`, testes de integração com cadeias de fibra,
   splitter, laço e quebra.
2. **Front:** regras puras de montagem da lista e do caminho no mapa, tela, botões de entrada e
   testes. Começa depois que o endpoint existir (ou com resposta falsa nos testes).

## O que fica para quem constrói

Nome exato das classes do backend, camadas da travessia (service de leitura, repositório), cache por
requisição, desenho da linha no mapa (cor e espessura), textos exatos das frases de quebra.

## Decisões tomadas sem o dono (revisar)

- Começo: fibra, caixa, splitter e fusão. Conector entra como fusão.
- Direção UPSTREAM = em direção à OLT; DOWNSTREAM = em direção aos clientes.
- Limite de 50 passos e motivo `DEPTH_LIMIT`.
- Splitter: saídas numeradas como na tela (1..N), sem o número interno da porta.
- Clientes no splitter só sob demanda (`traceRef`).
- Marcador vermelho para cada quebra no mapa, na posição do item (ou da caixa, se não houver coordenada).
  Pedido do dono.
