# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Técnico de campo** (principal): levanta e documenta uma rede FTTH que já existe. Está na rua,
  diante da caixa aberta, com o celular na mão, registrando o que vê: cabos, tubos, fibras,
  fusões, splitters, portas e clientes.
- **Outro técnico, depois**: consulta o que foi registrado num ponto onde nunca esteve, para
  reconhecer a caixa real pelo que está na tela.
- **Atendente do provedor / pessoa leiga**: navega pela rede para entender o que está acontecendo
  (de onde vem o sinal de um cliente, o que está ligado com o quê). Lê; não monta a rede.

## Product Purpose

Documentação de rede FTTH sobre um mapa: OLTs, caixas (CTO, CEO, DIO), cabos e clientes, com o
interior de cada elemento (portas PON, bandejas, fusões, conectores, splitters, portas de
atendimento). Sucesso: o técnico registra rápido e sem erro, e quem vem depois entende a rede real
só olhando a tela.

## Positioning

A tela imita o que existe na vida real (cores ópticas padrão de tubos e fibras, bandejas com as
posições físicas, cabos e caixas no mapa) em vez de tabelas, para servir ao mesmo tempo ao técnico
que registra e a quem só consulta.

## Operating Context

- Uso em campo, no celular; também no computador do escritório. A interface precisa ser responsiva
  e clara.
- Backend próprio (Spring, `/api/v1`) em `C:\Users\Admin\Documents\geofiber-backend`; tipos,
  situações e enums seguem o backend.
- Hoje é usado internamente por um provedor; a intenção é oferecê-lo depois a outros provedores.

## Capabilities and Constraints

- Mapa (Leaflet) com criar, editar, mover e excluir OLTs, caixas, clientes e cabos; legenda, busca,
  filtros, tema claro e escuro.
- Fichas laterais: cabo (traçado, tubos e fibras), caixa (interior), OLT (portas PON), cliente
  (situação, histórico); ajuda para leigos (glossário, "?" nos termos, "O que estou vendo?").
- Planejado e aprovado: tela de fusões em página própria
  (`docs/superpowers/specs/2026-11-20-tela-de-fusoes-design.md`).
- Textos de tela em pt-BR simples; nenhum código do backend aparece na tela; pontas A/B de fibra
  só em modo avançado.
- Autenticação virá depois; edição passa por um único ponto (`canEdit`).
- Fora do escopo por enquanto: rastreio de fibra pela rede, 3D.

## Brand Commitments

Só o nome **GeoFiber**. Não há logo, cores ou tipografia obrigatórias. A identidade visual deve
poder servir a vários provedores no futuro.

## Evidence on Hand

Nenhum depoimento, cliente citável, número de desempenho ou material de imprensa. Não inventar.

## Product Principles

1. **A tela parece a rede real.** Cores ópticas, posições físicas e nomes que o técnico usa em campo.
2. **Clareza antes de densidade.** O leigo precisa entender sem treinamento; termos técnicos têm
   explicação a um toque.
3. **Registrar sem errar.** Escolher tocando no que se vê, não procurando em listas.
4. **Celular primeiro, sem perder o escritório.** Tudo funciona com o dedo e também numa tela grande.
5. **O que foi registrado é a fonte para quem vem depois.**

## Accessibility & Inclusion

As cores ópticas carregam significado (tubos e fibras); toda cor precisa vir acompanhada de nome ou
número, nunca sozinha. (Proposta a confirmar com o dono; já é a regra nos desenhos da tela de
fusões.)
