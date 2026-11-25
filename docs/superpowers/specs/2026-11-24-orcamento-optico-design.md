# Orçamento óptico (splitters desbalanceados, sinal esperado e leituras) — design

Data: 2026-11-24 · Situação: **aprovado pelo dono** (etapa 1 pode começar; etapas 2 e 3 depois de
vários provedores).

## Intenção

A rede real mistura splitters balanceados e desbalanceados: estrela a partir de uma CEO, dois
níveis balanceados e, muito comum, **cascata desbalanceada**, em que cada CTO tem atrás um splitter
de **derivação** (1x2 90/10, 80/20…) e na frente um splitter **conectorizado** (1x8/1x16) para os
clientes. A saída pequena da derivação alimenta o conectorizado; a grande é fundida na fibra que
segue para a próxima CTO.

Hoje o GeoFiber guarda só "balanceado sim/não": o técnico não sabe qual saída é a de 10% e não há
como saber se o sinal chega. O dono quer o número para **duas coisas**:

- **Planejar:** antes de ligar uma CTO nova ou acrescentar uma derivação, ver o sinal esperado ali e
  quanto sobra até o limite da ONU.
- **Diagnosticar:** quando um cliente reclama, comparar o sinal **esperado** com o **medido** e
  achar no caminho onde está a perda a mais.

A potência de partida é a do **SFP** de cada porta PON (varia por porta/placa); o técnico informa.
As leituras medidas, por enquanto, o técnico **digita**; integração com a OLT fica para bem depois.

## Objetivos

1. Splitter desbalanceado com a **porcentagem de cada saída**, em qualquer divisão (1x2 é o comum;
   1x3/1x4 desbalanceados também cabem). A tela mostra "Saída 1 · 10%".
2. **Perda por saída** do splitter editável (valor de fabricante), com padrão calculado.
3. **Ligar a saída de um splitter na entrada de outro** dentro da mesma caixa (derivação →
   conectorizado), sem precisar de fibra de cabo no meio.
4. **Potência do SFP** por porta PON.
5. **Sinal esperado** (dBm) e **sobra** (dB até o limite da ONU) em cada passo do rastreio, nas
   saídas de splitter, nas portas de atendimento e no cliente, em qualquer combinação de
   splitters.
6. **Comprimento de cada trecho** de fibra medido pelo traçado do cabo no mapa, com correção manual
   opcional por trecho.
7. **Leituras medidas** digitadas pelo técnico, com histórico, comparadas com o esperado.

## Não-objetivos

- Integração com a OLT (SNMP, CLI, TR-069) para ler potência ou sinal da ONU.
- Sentido de subida (ONU → OLT, 1310 nm) e potência de transmissão da ONU.
- Várias tecnologias ao mesmo tempo (GPON e XGS-PON com comprimentos de onda e perdas próprias):
  uma configuração de descida só, por enquanto.
- OTDR e localização de evento por distância.
- Sinal esperado gravado no banco, filtro no mapa ("CTOs com sobra < 3 dB"): pode vir depois em
  cima desta abordagem (abordagem C abaixo).
- Cabo drop cadastrado como cabo de verdade.

## Antiobjetivos (seria falha mesmo funcionando)

- Um número "exato" que esconde o que foi estimado: a tela precisa dizer quando usou valor padrão
  e quando falta dado ("falta a potência do SFP da porta 1/3").
- Calcular errado em rede misturada (ex.: tratar desbalanceado como balanceado sem avisar).
- Conta feita no front: o número tem que ser o mesmo em ficha, rastreio, relatório futuro e
  integração futura.
- Códigos do backend ou jargão em inglês na tela.

## Abordagens consideradas

- **A. Backend calcula junto com o rastreio — escolhida pelo dono.** O rastreio já percorre fibra,
  fusão, saída de splitter e porta de atendimento; soma as perdas em cada passo e devolve o sinal
  esperado. Porta de atendimento e cliente usam o mesmo cálculo. Configuração, potência do SFP e
  leituras ficam no banco. Um número em todo lugar; o front só mostra. Custo: a maior parte do
  trabalho é no backend.
- **B. Front calcula a partir do rastreio.** Menos backend, mas a regra fica só na tela, exige
  várias requisições e contraria "regras seguem o backend". Descartada.
- **C. Sinal esperado pré-calculado e gravado.** Leitura instantânea e filtro no mapa, mas toda
  escrita de fusão/splitter/porta obriga a recalcular a cascata abaixo. Não se justifica agora.

**Ordem (aprovada):** 1) splitters; 2) sinal esperado; 3) leituras. Cada etapa funciona sem a
seguinte.

## O modelo de cálculo

Sinal esperado num ponto = **potência do SFP da porta PON** − **soma das perdas** da OLT até o
ponto, seguindo o caminho gravado (o mesmo do rastreio, sentido descida). Perdas:

| Elemento | Perda usada |
|---|---|
| Fibra | comprimento do trecho (km) × perda por km da configuração |
| Fusão | `attenuationDb` da fusão, senão padrão da configuração |
| Conector | `attenuationDb` da conexão, senão padrão de conector |
| Saída de splitter | `attenuationDb` da porta, senão padrão (abaixo) |
| Ligação splitter → splitter na caixa | padrão de fusão |
| Porta de atendimento → ONU (drop) | comprimento estimado do drop × perda por km + 2 conectores |

**Padrão da saída de splitter:**

- **Balanceado:** tabela da configuração por divisão. Valores de referência (PLC):
  1x2 3,7 · 1x4 7,3 · 1x8 10,5 · 1x16 13,7 · 1x32 17,1 · 1x64 20,5 dB.
- **Desbalanceado:** `10·log10(100 / porcentagem) + excesso`, com excesso da configuração (padrão
  0,5 dB). Vale para qualquer divisão. Exemplos com 0,5: 10% → 10,5 dB; 90% → 1,0 dB;
  20% → 7,5 dB; 80% → 1,5 dB. A tela de configuração deixa claro que são referências e que o
  valor do fabricante, informado na saída, sempre vence.

**Comprimento do trecho:** uma fibra é uma entidade do cabo inteiro, mas o sinal entra e sai dela
em caixas no meio (sangria). O trecho é a distância **ao longo do traçado** do cabo entre o ponto
do cabo mais próximo da caixa onde o sinal entra e o da caixa onde sai (PostGIS: localizar os dois
pontos na linha e medir a sublinha em metros, geografia). Se a caixa está fora do traçado, usa o
ponto mais próximo. **Correção manual:** cada ligação do cabo a um elemento (`CableAttachment`)
pode ter o comprimento do trecho até o próximo elemento da lista; quando existe, vence o traçado.
Reserva técnica não entra: 50 m de sobra dão ~0,01 dB, abaixo da margem de erro.

**Drop:** distância em linha reta entre a caixa e o cliente × 1,3 (fator da configuração), com
correção manual opcional no cliente. Sem cliente ligado, a porta de atendimento mostra o sinal na
porta (sem drop).

**Limites por ONU:** cada provedor tem um **catálogo de modelos de ONU** (fabricante, modelo,
classe, sensibilidade, sobrecarga), que já vem com classes genéricas (B+ −27/−8 dBm, C+ −30/−8 dBm).
O cliente tem "Modelo da ONU" opcional; sem ele, vale a **ONU padrão** da configuração e a tela
avisa "limite da ONU padrão". Pontos sem cliente (saída de splitter, porta livre, CTO em
planejamento) usam a ONU padrão. A margem de segurança (padrão 3 dB) e a tolerância entre esperado e
medido (3 dB) são da configuração do provedor.

**Situação do sinal num ponto:**

- **Bom:** sobra ≥ margem.
- **No limite:** 0 ≤ sobra < margem.
- **Fraco:** abaixo da sensibilidade.
- **Forte demais:** acima da sobrecarga (comum em CTO perto da OLT com derivação pequena).
- **Sem cálculo:** falta dado (abaixo); a resposta diz o quê.

**Quando não calcula (e diz por quê):** porta PON sem potência do SFP; splitter desbalanceado sem
porcentagens (splitters antigos ficam assim até alguém preencher); caminho quebrado (já é tratado
pelo rastreio); caminho que não chega a uma OLT. Valores padrão usados (fusão sem perda, trecho pelo
traçado) **não** impedem o cálculo, mas a resposta conta quantos foram usados ("estimado com 4
fusões no valor padrão").

## Etapa 1 — Splitters

**Backend (o dono implementa):**

- `SplitterPortEntity.sharePercent` (número, opcional, só saídas). Splitter desbalanceado exige as
  porcentagens de todas as saídas na criação, somando 100 (tolerância 0,5); balanceado não aceita
  (é sempre igual). `SplitterRequest` ganha `outputShares: number[]` (ordem das saídas 1..N).
  Trocar de balanceado para desbalanceado (o `PUT` já permite mudar `balanced`) exige as
  porcentagens no mesmo pedido.
- `attenuationDb` da porta já existe e já é editável; a resposta da porta passa a trazer também
  `defaultAttenuationDb` (o padrão calculado), para a tela mostrar "padrão 10,5 dB".
- **Ligação splitter → splitter:** a porta de **entrada** de um splitter aceita, em vez de fibra,
  `sourceSplitterPortId`: uma saída de outro splitter da **mesma caixa**, livre, que não alimente
  porta de atendimento nem tenha fibra. Mesmo padrão de `ServicePortRequest.splitterPortId`. Ciclos
  (A alimenta B que alimenta A) são recusados. Ocupação das duas portas segue as regras atuais.
- **Rastreio** atravessa essa ligação nos dois sentidos (subida e descida), com um passo novo ou o
  passo de splitter já existente — à escolha do backend, desde que o front saiba distinguir.
- Erros em ProblemDetail, como hoje.

**Front:**

- Criar splitter: com "Balanceado" desligado, escolher a proporção. Para 1x2, uma lista
  1/99, 2/98, 5/95, 10/90, 15/85, 20/80, 25/75, 30/70, 35/65, 40/60, 45/55 e "outra" (digitar);
  para outras divisões, uma porcentagem por saída. Decisão: na lista do 1x2, a **saída 1 é a menor**
  ("10/90" = saída 1 com 10%); dá para trocar.
- Nome do splitter: "Splitter 1x2 10/90" (desbalanceado 1x2), "Splitter 1x4 desbalanceado"
  (outros), "Splitter 1x8" (balanceado). Saídas: "Saída 1 · 10%".
- Perda da saída editável na ficha da caixa e no diagrama de fusões, com o padrão como dica.
- Entrada do splitter: além de "fibra", a opção "saída de outro splitter desta caixa".
- Splitter desbalanceado antigo, sem porcentagens: aviso "Informe a proporção" com atalho.
- Diagrama de fusões (`/caixas/:boxId/fusoes`) mostra a ligação splitter → splitter.

## Etapa 2 — Sinal esperado

**Backend:**

- `OltPortEntity.txPowerDbm` (opcional). Criação em lote de portas PON aceita um valor para todas;
  edição por porta.
- **Configuração do orçamento óptico, uma por provedor:** perda por km (padrão 0,25 dB/km, descida
  1490 nm), fusão (0,1 dB), conector (0,5 dB), tabela de balanceados, excesso de desbalanceado
  (0,5 dB), fator do drop (1,3), ONU padrão, margem (3 dB), tolerância esperado × medido (3 dB).
  `GET /settings/optical-budget` para todos do provedor; `PUT` só administrador do provedor.
- **Catálogo de ONUs, por provedor:** `GET/POST/PUT/DELETE /onu-models` (escrita só administrador;
  modelo em uso por cliente não é apagado). Começa com as classes genéricas.
- `CustomerEntity.onuModelId` (opcional).
- `CableAttachment.segmentLengthMeters` (opcional, correção manual do trecho até o próximo
  elemento) e `CustomerEntity.dropLengthMeters` (opcional).
- **Rastreio:** cada passo passa a ter `lossDb` (perda do passo), `expectedDbm` (sinal depois do
  passo) e, nos passos de fibra, `lengthMeters` do trecho e se veio do traçado ou do manual. Um
  resumo novo `power`: potência de partida, sinal no fim, sensibilidade, sobra, situação, lista do
  que falta e contagem de padrões usados. No rastreio de subida (do cliente para a OLT), o backend
  acha a OLT e calcula de lá para baixo; o sinal de cada passo é sempre o "sinal que chega ali".
  Nas `branches` (saídas do splitter), o sinal esperado de cada saída.
- Porta de atendimento, saída de splitter e cliente: o sinal esperado e a situação no resumo da
  caixa (`BoxOverviewResponse`) e no cliente — à escolha do backend se embutido ou endpoint
  próprio, desde que a ficha da caixa não precise de um rastreio por porta.

**Front:**

- **Rastreio:** em cada passo, "−18,2 dBm" e a perda do passo; no topo, "Sinal esperado no fim:
  −21,8 dBm · sobra 5,2 dB" com a situação em cor (bom/no limite/fraco/forte demais) e os avisos
  ("falta a potência do SFP da porta 1/3", "4 fusões no valor padrão").
- **Ficha da caixa:** sinal esperado em cada saída de splitter e porta de atendimento (planejar:
  ver a sobra da CTO antes de ligar mais uma derivação).
- **Ficha do cliente:** sinal esperado, sobra e situação; "Modelo da ONU" no formulário.
- **Catálogo de ONUs:** na tela de configuração (administrador).
- **Ficha da OLT:** potência do SFP por porta, editável; no lote de portas, um campo para todas.
- **Ficha do cabo:** comprimento de cada trecho (traçado) com correção manual.
- **Configuração:** tela só de administrador (`adminGuard`), entrada no painel lateral como
  Usuários; textos explicam cada valor em linguagem simples.
- Glossário: "sinal esperado", "sobra", "dBm", "derivação", "splitter conectorizado".

## Etapa 3 — Leituras medidas

**Backend:**

- `PowerReading`: alvo (porta PON, saída de splitter, porta de atendimento ou cliente), valor em
  dBm, comprimento de onda (1490 padrão; 1550 e 1310 possíveis), quando (padrão agora, editável),
  quem mediu (do login), instrumento (power meter ou ONU) e observação.
- `GET` por alvo (histórico, mais recente primeiro), `POST`, `DELETE` (quem criou ou administrador).
- A resposta de cada leitura traz o esperado no momento da consulta e a diferença.

**Front:**

- "Registrar leitura" na porta de atendimento, na saída de splitter, na porta PON e no cliente.
- Lado a lado: "Esperado −21,8 · Medido −26,9 · **5,1 dB pior que o esperado**". Até 3 dB de
  diferença (tolerância da configuração) é normal; mais que isso, alerta "perda acima do esperado —
  confira fusões e conectores do caminho" com atalho para o rastreio. Medido muito melhor que o
  esperado: "acima do esperado — confira o cadastro (proporção, potência)".
- Histórico de leituras com data e quem mediu; dá para ver se o sinal está piorando.
- No rastreio, a última leitura de cada ponto medido aparece no passo, para localizar onde a perda
  aparece entre duas medições.

## Decisões tomadas por mim (revisar)

- (Do dono) Limite por ONU: catálogo de modelos por provedor e modelo no cliente; ONU padrão quando
  faltar.
- Margem e tolerância por provedor, não por cliente.
- Saída 1 é a menor na lista do 1x2.
- Perda de desbalanceado pela fórmula com excesso, não por tabela de fabricante (cobre qualquer
  divisão).
- Reserva técnica fora do cálculo (efeito desprezível).
- Drop pela linha reta × 1,3, corrigível no cliente.
- Tolerância de 3 dB entre esperado e medido (configurável).
- Configuração só para administrador.
- Leitura na porta PON também (conferir a potência real do SFP).

## Vários provedores

O GeoFiber é pensado como produto para vários provedores (SaaS), com login de teste e dados de
exemplo para demonstração. Hoje o backend **não separa dados por provedor** (só há a regra do
criador). Isso é um projeto próprio, com design separado, feito **antes das etapas 2 e 3**: a
configuração, o catálogo de ONUs e as leituras já nascem do provedor. A etapa 1 (splitters) não tem
dado de provedor e pode andar em paralelo.

## O que fica para quem implementar

- Nomes exatos de campos, enums e endpoints no backend (o front segue o que for publicado e
  regenera os tipos com `npm run api:types`).
- Como o rastreio representa a ligação splitter → splitter.
- Consulta PostGIS do trecho e desempenho do resumo da caixa com muitas portas.
- Arredondamento: uma casa decimal na tela.

## Documentação

Cada etapa atualiza `docs/SPECS.md` (nova RI), `docs/GUIA.md` (como ler o sinal, como registrar
leitura), `README.md` e tem plano próprio em `docs/superpowers/plans/`. As etapas 1 e 2 dependem do
backend publicado; o plano do front de cada uma começa depois do contrato definido.
