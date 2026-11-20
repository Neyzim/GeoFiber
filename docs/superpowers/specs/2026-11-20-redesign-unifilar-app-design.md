# Redesign "Esquema Unifilar" na aplicação inteira — design

Data: 2026-11-20 · Substitui a execução de `docs/superpowers/plans/2026-11-20-visual-redesign-unifilar.md`
(executada só em parte: componentes criados, mas a tela não os usa).

Fontes: `DESIGN.md` (visual aprovado), `.impecable.md` (contexto técnico escrito pelo dono),
`PRODUCT.md`. Onde as fontes divergem, vale a decisão desta página (lista em §9).

## 1. Por que o visual não apareceu (diagnóstico)

| Problema | Onde |
|---|---|
| `DiagramLineComponent` importado e nunca usado no template | `box-sheet.ts` / `box-sheet.html` |
| 24 variáveis `--unifilar-*` / `--fiber-*` criadas e nunca lidas | `src/styles.scss:33-68` |
| Tema escuro novo depende de `prefers-color-scheme`; o app troca o tema pela classe `html.dark-theme` | `styles.scss`, `core/services/theme.ts` |
| Fonte Roboto, cores azure/green do Material, raios 8–14px e sombras fortes continuam | todos os `.scss` |
| Teste de "integração visual" só monta os componentes soltos | `visual-redesign.integration.spec.ts` |
| Fichas sem abas, sem linha "chega → elemento → sai" | `*-sheet.html` |

## 2. Princípio

Toda ficha abre com **uma única linha**: o que chega → o elemento → o que sai. Entrada à
esquerda, saída à direita, também no celular. Situação codificada **na forma da linha**; a cor
reforça, nunca é a única pista. Cores ópticas ABNT sempre acompanhadas de número ou nome.

## 3. Tokens (fonte única: `src/theme/_tokens.scss`)

Todos os valores de cor usam `light-dark(claro, escuro)`. O tema é decidido pelo `color-scheme`
do `<html>`, que a classe `html.dark-theme` troca. **Nunca** usar `prefers-color-scheme` nos estilos.

### 3.1 Neutros e destaque

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--gf-bg` | `oklch(97.2% 0.003 247.9)` (#f4f6f8) | `oklch(21.8% 0.017 248.6)` (#141b22) | fundo da aplicação |
| `--gf-surface` | `oklch(100% 0 0)` | `oklch(26.9% 0.023 251.3)` (#1e2731) | fichas, painéis, gaveta |
| `--gf-surface-2` | `oklch(95.7% 0.005 247.9)` | `oklch(31.1% 0.027 248.7)` | blocos internos, hover |
| `--gf-border` | `oklch(88.3% 0.014 233.8)` (#d0dae0) | `oklch(40.2% 0.034 248.7)` (#3a4a5a) | bordas 1px |
| `--gf-text` | `oklch(26.9% 0.023 251.3)` | `oklch(97.2% 0.003 247.9)` | texto |
| `--gf-text-2` | `oklch(52.1% 0.027 246.3)` (#5d6b78) | `oklch(76% 0.037 247)` | texto secundário, traço do diagrama |
| `--gf-accent` | `oklch(51.5% 0.106 161.6)` | `oklch(74.6% 0.181 152.3)` | aba ativa, botões, links |
| `--gf-on-accent` | `oklch(100% 0 0)` | `oklch(26.9% 0.023 251.3)` | texto sobre `--gf-accent` |
| `--gf-accent-soft` | `oklch(95% 0.03 161.6)` | `oklch(32% 0.05 160)` | fundo de item ativo |

### 3.2 Situação (semântica)

| Token | Claro | Escuro | Significa |
|---|---|---|---|
| `--gf-status-normal` | `oklch(61.8% 0.13 160.7)` | `oklch(74.6% 0.181 152.3)` | ativo, livre, disponível |
| `--gf-status-info` | `oklch(53.4% 0.125 252.4)` | `oklch(67.1% 0.109 247.5)` | instalado, ocupado (em uso) |
| `--gf-status-alert` | `oklch(69.9% 0.146 67.7)` | `oklch(76.3% 0.163 69.4)` | planejado, reservado, bloqueado |
| `--gf-status-critical` | `oklch(57.9% 0.187 25.2)` | `oklch(63.1% 0.194 29.4)` | danificado, rompido, com defeito |
| `--gf-status-inactive` | `oklch(66.8% 0.024 250.3)` | `oklch(57.3% 0.029 248.3)` | desativado, cancelado |
| `--gf-critical-soft` | `oklch(95% 0.03 25)` | `oklch(32% 0.07 25)` | fundo de mensagem de erro |
| `--gf-on-critical-soft` | `oklch(45% 0.16 25)` | `oklch(88% 0.06 25)` | texto de mensagem de erro |

As cores de situação **não são cor de texto** (o verde e o laranja dão 3,4:1 e 2,8:1 sobre branco).
Aparecem só como bolinha, traço ou borda, sempre ao lado de um texto em `--gf-text`.

Mapeamento (catálogos em `core/network`):

| Situação do backend | Token |
|---|---|
| Infra `ACTIVE`, fibra `AVAILABLE`, porta `FREE`, cliente `ACTIVE` | `normal` |
| Infra `INSTALLED`, fibra/porta `OCCUPIED` | `info` |
| Infra `PLANNED`, fibra/porta `RESERVED`, cliente `BLOCKED` | `alert` |
| Infra `DAMAGED`, fibra `BROKEN`, porta `FAULTY` | `critical` |
| Infra `DEACTIVATED`, cliente `CANCELLED` | `inactive` |

Linhas do mapa (canvas do Leaflet) não leem variáveis CSS: `cableLineStyle` usa hex fixo
`#d23c3c` (danificado) e `#8a96a3` (desativado). As cores por função do cabo e por tipo de
elemento (OLT, CTO, CEO, DIO, cliente) **não mudam**: são a identidade do mapa.

### 3.3 Fibras ABNT

Os hex de `OPTICAL_COLORS` **não mudam**. Cada cor ganha a tinta do número que vai por cima:

| Tinta escura (`--gf-ink-dark`, #1e2731) | Tinta clara (`--gf-ink-light`, #fff) |
|---|---|
| Verde, Amarelo, Branco, Azul, Rosa, Cinza, Laranja, Turquesa | Vermelho, Violeta, Marrom, Preto |

Toda bolinha de fibra/tubo tem borda `1px solid var(--gf-fiber-edge)`:
`light-dark(oklch(0% 0 0 / 0.35), oklch(100% 0 0 / 0.55))` (o preto aparece no tema escuro, o
branco no claro). Toda bolinha tem `aria-label` e `title` ("Fibra 3 · Branco").

### 3.4 Forma, tipografia, espaço

| Token | Valor |
|---|---|
| `--gf-radius-control` | `4px` (botões, campos, chips, linhas clicáveis) |
| `--gf-radius-panel` | `6px` (fichas, painéis flutuantes, diálogos) |
| `--gf-shadow-float` | `0 1px 2px oklch(0% 0 0 / 0.16), 0 2px 8px oklch(0% 0 0 / 0.1)` |
| `--gf-font-ui` | `'IBM Plex Sans', system-ui, sans-serif` |
| `--gf-font-data` | `'IBM Plex Mono', ui-monospace, monospace` |
| `--gf-touch` | `44px` |

- Grade de 4px: `padding`, `gap`, `margin` e alturas em múltiplos de 4 (exceção: `1px` de borda e
  `2px` do sublinhado da aba).
- Dados técnicos (coordenadas, dB, números de fibra/porta, ocupação, zoom) usam a classe global
  `.gf-data` = `--gf-font-data` + `font-variant-numeric: tabular-nums`.
- Painéis sobre o mapa: borda `1px var(--gf-border)` + `--gf-shadow-float`. Os marcadores (pins)
  mantêm a sombra própria (precisam aparecer sobre satélite).

### 3.5 Material

Os tokens `--mat-sys-*` passam a apontar para os `--gf-*` (superfícies, texto, contorno, primária,
erro, cantos). Botões `4px`, diálogo `6px`, menu/tooltip/snackbar/campo `4px`. Botão de ícone
continua redondo. Fonte do tema Material: IBM Plex Sans.

## 4. Mapa

- O tema não muda o mapa (decisão do dono, 2026-11-20). As camadas do CARTO ("Claro" e "Escuro")
  passaram a exigir chave e saíram; ficam ruas (OpenStreetMap) e satélite (Esri).
- Foco: com um elemento ou cabo selecionado, os outros marcadores ficam com opacidade `0.45`
  (classe `gf-map--focus` no container) e os outros cabos com opacidade `0.35`. Selecionados e
  destacados (elementos do cabo aberto) ficam normais.
- Tooltip e balão do Leaflet: raio `--gf-radius-control`/`--gf-radius-panel`, borda 1px,
  `--gf-shadow-float`, fonte `--gf-font-ui`.
- Barra de status: valores em `.gf-data`.

## 5. Ficha (gaveta)

Estrutura comum às quatro fichas (cabo, caixa, OLT, cliente):

```
┌ topo (não rola) ─────────────────────────────┐
│ [CTO] CTO-05                       ✎  ✕      │  título; "✎" = Editar dados (só canEdit)
│ ● Ativa                                       │
│ Chega            ┌──────┐            Sai      │  app-unifilar-summary
│ CABO-01  ───────▶│ CTO  │───────▶  CABO-03    │  (até 3 de cada lado, "+N")
│ CABO-02          └──────┘                     │
│ Resumo   Fusões   Portas                      │  app-sheet-tabs (sublinhado 2px)
├ corpo (rola) ────────────────────────────────┤
│ conteúdo da aba ativa                         │
└───────────────────────────────────────────────┘
```

- Computador (≥ 900px): painel à direita, `400px` de largura, altura máxima `calc(100dvh - 120px)`.
- Celular (< 900px): gaveta presa embaixo, largura total, altura `60dvh`, cantos de cima `6px`.
- Topo fixo, só o corpo rola (as abas nunca somem).
- Ao trocar de elemento, a ficha volta para a aba **Resumo**.
- Linhas clicáveis com altura mínima `44px`.

Abas:

| Ficha | Abas |
|---|---|
| Caixa CEO/DIO | Resumo · Fusões · Splitters |
| Caixa CTO | Resumo · Portas · Fusões (só se houver bandeja ou conector) |
| Cabo | Resumo · Fibras |
| OLT | Resumo · Portas PON |
| Cliente | Resumo · Histórico |

Linha única do topo ("chega → elemento → sai"):

| Ficha | Chega | Sai | Texto quando vazio |
|---|---|---|---|
| Caixa | cabos que terminam (`END`) ou passam (`PASS_THROUGH`) | cabos que começam (`START`) ou passam | "Nada chega aqui" / "Nada sai daqui" |
| Cabo | primeiro elemento da lista | último elemento (se houver 2+) | idem |
| OLT | — | todos os cabos da OLT | "Origem do sinal" / idem |
| Cliente | CTO + "porta N" (não cancelado) | — | "Sem CTO" / "Ponto final" |

Forma da linha pela situação do elemento (`lineStateOf`):

| Situação | Estado | `stroke-dasharray` |
|---|---|---|
| `ACTIVE`, `INSTALLED` | `active` | (nenhum: cheia) |
| `PLANNED` | `planned` | `4 4` |
| `BLOCKED` / fibra `RESERVED` | `reserved` | `8 3` |
| `DEACTIVATED`, `CANCELLED` | `disabled` | `1 3` |
| `DAMAGED` / fibra `BROKEN` | `broken` | `6 2 1 2` |

## 6. Diagrama da emenda (`app-diagram-line`)

Uma linha por fusão e por conector: **entrada** (cabo, bolinha do tubo, bolinha da fibra com
número) ─ **meio** ("Posição 3" + "0,05 dB" / "Conector") ─ **saída**. Fibra que não está nos cabos
da caixa aparece como "Fibra de outro cabo". O grupo inteiro tem `aria-label` com a frase completa
("Entrada: CABO-01, tubo 1 (Verde), fibra 3 (Branco). Posição 3. Saída: …").

## 7. Ocupação sempre visível (`app-occupancy-badge`)

Formato `ocupado/total unidade` em `.gf-data`: bandeja "3/12 posições", portas de atendimento
"6/8 ocupadas", splitter "2/8 saídas em uso", placa da OLT "6/8 ocupadas", tubo "4/12 em uso".
Com total `0` o selo não aparece (a seção mostra o texto de vazio).

## 8. Fora deste trabalho

- Tela de fusões em rota própria (`docs/superpowers/plans/2026-11-20-splice-screen-impl.md`): vem
  depois e já deve usar estes tokens e componentes.
- Rastreio de fibra, 3D, edição de emendas.
- Cores por tipo de elemento e por função do cabo (identidade do mapa, ficam como estão).
- Atalhos de teclado, navegação por setas nas abas.

## 9. Decisões tomadas sem o dono (revisar)

1. **Gaveta só no celular.** O `DESIGN.md` fala em gaveta de 300–360px de altura no computador; o
   `.impecable.md` pede painel lateral de 380–440px. Fica o painel lateral de 400px no computador e
   a gaveta embaixo no celular.
2. **Altura da gaveta no celular: 60dvh** em vez de 240–280px, para caber topo + abas + conteúdo.
3. **Destaque verde mais escuro** (`#177a54`, 5,3:1) para botões e aba ativa no tema claro; o
   `#1f9d6b` do `DESIGN.md` continua como cor de situação "normal".
4. **Duas cores novas:** `info` (azul, "instalado/ocupado") e `inactive` (cinza), que o
   `DESIGN.md` não tinha e os catálogos já usavam.
5. **Fonte:** IBM Plex Sans + IBM Plex Mono (o `.impecable.md` aceitava Inter, Geist ou Plex;
   Plex tem a versão mono que os dados técnicos pedem).
6. **Padrões de traço distintos** para planejado, reservado, desativado e rompido (antes rompido =
   desativado e reservado = planejado).
7. **Título da ficha:** a situação fica numa linha logo abaixo do nome, e "Editar dados" vira botão
   de ícone no cabeçalho (com o mesmo nome acessível).
8. **`.impecable.md` não foi renomeado.** As regras dele estão consolidadas aqui e no `DESIGN.md`;
   o dono decide se apaga o arquivo.
