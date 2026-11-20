# GeoFiber — Design Visual

Data: 2026-11-20 · Visual: **Esquema Unifilar**

<!-- impeccable:design-schema 1 -->

## O Visual

**Mundo:** Esquema Unifilar — diagramas das concessionárias de energia e telecom.

**Princípio:** Toda ficha abre com uma única linha: o que chega → o elemento → o que sai. Entrada à esquerda, saída à direita. Estado codificado na forma da linha, não na cor.

**Quando o usuário olha,** vê um mapa com as caixas e OLTs. Ao tocar numa caixa, uma gaveta sobe do fundo com:
- No topo: **diagrama de uma linha só** mostrando cada emenda entrada→saída
- Abas: Resumo / Fusões / Portas
- Os valores (3/12 posições, ocupação) sempre visíveis junto do rótulo

**Por que funciona:**
- Técnico reconhece seu mundo (esquema é o que ele desenha nos papéis)
- Leigo entende na hora (uma linha, duas pontas, fácil)
- Cores ópticas ABNT em toda a extensão
- Densidade: tudo cabe numa gaveta, sem rolar infinito

## Regras de Interface

### Gaveta (drawer)

- Altura: 240–280px no mobile, 300–360px no desktop
- Fundo: branco (tema claro) ou #1e2731 (tema escuro)
- Borda superior: 1px #d0dae0 (claro) / #3a4a5a (escuro)
- Título: "CTO-05 · Ativa" com ícone de tipo no canto (📦 CTO, 🔀 CEO, etc.)

### Diagrama (entrada → caixa → saída)

- 3 colunas: **Entrada** | **Elemento** | **Saída**
- Cada coluna tem um rótulo de cabo + tubo + fibra colorida
- Círculos coloridos (6–8px) = fibras ABNT
- Traço de 1px conectando entrada → caixa → saída
- Código de estado na forma da linha:
  - **Cheia** = instalado
  - **Tracejada (- - - -)** = planejado
  - **Riscada (···)** = desativado

### Abas (Resumo / Fusões / Portas)

- Fonte: 12px, font-weight: 500
- Ativa: cor verde (#1f9d6b claro / #2ecc71 escuro)
- Inativa: cinza (#5d6b78)
- Underline: 2px, animado

### Ocupação sempre visível

- "Bandeja 1 · **3/12 posições**"
- "Portas PON · **6/8 ocupadas**"
- Formato: **ocupado/total**, nunca só o número

### Paleta Esquema Unifilar

- **Fundo:** #f4f6f8 (claro) / #1e2731 (escuro)
- **Texto:** #1e2731 (claro) / #f4f6f8 (escuro)
- **Secundário:** #5d6b78
- **Normal:** #1f9d6b (verde)
- **Alerta:** #d98a1c (laranja)
- **Crítico:** #d23c3c (vermelho)
- **Fibras:** ABNT NBR 14721 completa (12 cores)
- **Valores oficiais (OKLCH, claro/escuro, com `info` e `inactive`):** em
  `docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md` §3 e no código em
  `src/theme/_tokens.scss`. Onde esta página e o spec divergem, vale o spec (§9).

### Modular: Grade 4px

- Gaveta, listas e abas alinham em múltiplos de 4px
- Padding: 16px (4 × 4), 12px (3 × 4)
- Raio de borda: 4–6px em componentes, 0px em caixas principais
- Altura de toque: mín. 44px (11 × 4px)

## Decisões Levantadas de Outros Mundos

1. **Emission Line Rail:** Estado redundante — a forma da linha (cheia/tracejada/riscada) diz situação mesmo sem cor
2. **Streaming Wall:** Elemento em foco cresce, resto escurece — aplicado ao selecionar um cabo ou cliente no mapa
3. **Cassette J-Card:** Capacidade nunca escondida — bandejas mostram sempre "3/12", portas "6/8"
4. **Laban Notation:** Entrada fixa à esquerda, saída à direita — esquema é simetria, não flexibilidade
5. **Crouwel Grid:** Módulo único rígido (4px) — coesão em toda a interface

## Anti-objetivos

- ❌ Tabelas ou listas para escolher fibra
- ❌ Códigos backend na tela (START, B, etc.)
- ❌ Sem cor dos tubos/fibras ABNT
- ❌ Esquema que cresce para diagrama completo

## Fora de escopo agora

- Rastreio de fibra pela rede
- 3D (adiado)
- Edição de emendas (backend não tem PUT; corrigir = excluir + registrar)
- Visualização de mais de um elemento por vez

## Arquitetura

**Componentes novos:**
- `diagram-line` — renderiza entrada → caixa → saída com traço e fibras
- `state-line-style` — retorna estilo de linha (cheia/tracejada/riscada) por situação
- Atualização de `sheet-drawer` para suportar o novo layout

**Componentes existentes reutilizados:**
- `fiber-selector` (já em box-interior)
- `occupancy-badge` (novo nome para o indicador "3/12")
- Material tabs (abas Resumo/Fusões/Portas)

## Próximos passos

1. ✅ Decisão visual aprovada
2. ✅ Plano de implementação (TDD)
3. ✅ Implementar diagram-line, state styles, ocupação
4. ✅ Atualizar fichas laterais (CableSheet, BoxSheet, OltSheet, CustomerSheet)
5. ✅ Tema escuro/claro compatível
6. ✅ Lista de validação no navegador entregue (conferência pelo dono pendente)
7. ✅ Atualizar SPECS, GUIA, README

Executado pelo plano `docs/superpowers/plans/2026-11-20-redesign-unifilar-app.md` (design em
`docs/superpowers/specs/2026-11-20-redesign-unifilar-app-design.md`).
