# Importar rede de KMZ/KML — design

Data: 2026-11-20 · Situação: para aprovação do dono.

## Intenção

O GeoFiber quer ser o sistema de mapeamento FTTH open source que um provedor adota no dia a dia,
ganhando do OZMap (que cobre tudo) pela **clareza e facilidade de uso**: fusões, caminho da fibra e
impacto de manutenção de forma visual. Nada disso importa se o provedor não consegue **trazer a
rede que já tem**. O formato mais usado para isso é o **KMZ** (do OZMap, Google Earth e outros).
Esta é a porta de entrada do provedor: precisa ser rápida, clara e segura.

Palavras do dono: "não existe padrão"; "o cliente decide o que cada pin do KMZ/KML vai representar
na aplicação, podendo configurar em grupo ou individualmente"; "importar de novo sem duplicar";
"os pontos já vêm nomeados, é só lembrar de exibir o nome".

## Objetivos

1. Abrir um arquivo **KMZ ou KML** (KMZ = KML compactado em zip, com ícones).
2. Juntar os itens parecidos em **grupos** e deixar a pessoa decidir o que cada grupo vira, com
   ajuste **item a item**, sempre mostrando o **nome** de cada ponto/linha.
3. Ver o resultado **no mapa** antes de confirmar.
4. **Importar de novo** (bairro novo, arquivo atualizado) **sem duplicar**, sem estragar o que já
   foi documentado.
5. Importação **inteira ou nada**: nunca uma rede meio importada.

## Fora do escopo (agora)

- Exportar para KMZ/KML (está no roadmap; vem depois).
- Clientes: o backend exige código de contrato e porta de atendimento, que o KMZ não traz.
- Postes, reservas técnicas e outros tipos que o GeoFiber não tem (a pessoa escolhe "Ignorar").
- Tubos, fibras, fusões e splitters: o KMZ não traz conectividade óptica; ela é registrada no
  GeoFiber depois (é onde ele quer ser mais claro).
- Apagar elementos que sumiram do arquivo: importar só acrescenta ou corrige.
- Polígonos (áreas), `NetworkLink`, `gx:Track`, sobreposições de imagem: ignorados com aviso.

## Anti-objetivos

- Adivinhar tipos sem mostrar à pessoa (sem padrão, adivinhar errado é pior que perguntar).
- Duplicar elementos ao importar de novo.
- Alterar elementos que já têm documentação óptica (fusões, fibras emendadas) sem a pessoa pedir.
- Deixar a rede meio importada depois de um erro.
- Tabelas densas com códigos do backend; textos em pt-BR simples como o resto do app.

## Restrições

- Frontend Angular 22 standalone/signals/OnPush, TDD, docs junto (SPECS, GUIA, README, CLAUDE.md,
  plano). Tipos e enums seguem o backend; o que faltar no backend o dono implementa lá.
- Backend Spring (`/api/v1`, ProblemDetail, coordenadas `{longitude, latitude}`).
- Criação hoje exige: caixa `name`, `type` (CTO/CEO/DIO), `location`; OLT `name`, `location`; cabo
  `name`, `role`, `fiberCapacity`, `coordinates` (≥ 2 pontos). Situação padrão do backend: PLANNED.
- Ligação de cabo a elemento: `CableAttachment` com papel START / PASS_THROUGH / END.
- Edição passa por `NetworkMapState.canEdit` (hoje sempre `true`).

## Abordagens consideradas

- **A. Tudo no frontend com a API atual** (um `POST` por item). Sem mudar o backend, mas centenas
  de requisições, lento e, num erro no meio, rede meio importada. Descartada.
- **B. Tudo no backend** (envia o arquivo; o backend lê, agrupa e importa). Inteira ou nada, mas
  cada ajuste da tela de escolha vira ida e volta ao servidor, e a prévia fica pesada. Descartada.
- **C. Leitura no frontend, gravação de uma vez no backend — escolhida pelo dono.** O navegador
  lê o arquivo, agrupa, mostra a escolha e a prévia (instantâneo); no fim envia **uma lista pronta**
  a um endpoint novo que grava tudo **numa transação** e confere duplicados de novo.

## O fluxo (o que a pessoa vê)

Só com `canEdit` (sem permissão, o item do painel não aparece e a rota mostra "Sem permissão para
importar"). Entrada: item **"Importar KMZ/KML"** no painel lateral (abaixo de "Modelos de rede"), rota
`/importar`. Título da aba "GeoFiber — Importar rede".

### 1. Escolher o arquivo

Área de soltar arquivo + botão "Escolher arquivo" (`.kmz`, `.kml`). Lido no navegador. Erros
claros: "Este arquivo não é um KMZ/KML válido", "O KMZ não tem nenhum KML dentro", "Nenhum ponto ou
linha encontrado". Avisos (não bloqueiam): "12 áreas (polígonos) foram ignoradas".

### 2. Escolher o que cada grupo vira

```
Importar rede — rede-cidade.kmz                        [ Ver no mapa ]
PONTOS
 [ícone] pasta "CTOs"      212 itens: 180 novos · 30 já existem · 2 mudaram de lugar
         CTO-001, CTO-002, CTO-003 …                    → [ CTO          ▾] ▸ abrir
 [ícone] pasta "Emendas"    38 itens                    → [ CEO          ▾] ▸ abrir
 [ícone] pasta "Postes"  1.904 itens                    → [ Ignorar      ▾]
LINHAS
 ━━ vermelho grosso         12 itens                    → [ Alimentação  ▾] fibras [ 36 ]
 ── verde fino             340 itens                    → [ Distribuição ▾] fibras [ 12 ]
 Situação dos itens novos: [ Instalado ▾]
 ☑ Ligar as pontas dos cabos às caixas/OLTs a até 15 m    (287 ligações)
                                         [ Cancelar ]  [ Importar 602 itens ]
```

- **Grupos de pontos:** mesmo caminho de pasta + mesmo ícone (imagem e cor). **Grupos de linhas:**
  mesmo caminho de pasta + mesma cor e espessura. O nome do grupo é a pasta; o ícone do KMZ é
  mostrado quando existe (senão, uma bolinha na cor do estilo).
- Opções para pontos: CTO, CEO, DIO, OLT, Ignorar. Para linhas: Backbone, Alimentação,
  Distribuição, Drop, Interconexão, Ignorar — e **quantidade de fibras** por grupo (padrão 12).
- **Sugestão inicial** (só sugestão, sempre visível e trocável): se o nome da pasta ou da maioria
  dos itens começa com CTO/CEO/DIO/OLT, o grupo já vem com esse tipo; o resto vem "Escolha…" e o
  botão Importar fica desabilitado até todo grupo ter uma escolha (Ignorar conta como escolha).
- **"abrir"** lista os itens do grupo com **nome**, situação de duplicado e um seletor por item
  para trocar o tipo só dele (ou ignorá-lo). Item sem nome aparece como "(sem nome)".
- **Situação dos itens novos:** uma escolha para tudo (padrão "Instalado"; a rede do arquivo já
  existe de verdade).
- **Ver no mapa:** mapa com o que será criado (cor do tipo escolhido), o que já existe (apagado) e
  o que mudou de lugar (seta da posição antiga para a nova). Tocar num item mostra nome e decisão.

### 3. Importar

Um clique; barra de progresso; ao terminar: "Importação concluída: 180 caixas, 340 cabos criados,
2 posições atualizadas, 287 ligações de cabo." com botão "Ver no mapa" (vai ao mapa enquadrando o
que foi importado). Erro → mensagem traduzida, **nada foi gravado**, a tela mantém as escolhas.

## Regras de duplicado (importar de novo)

Calculadas no frontend contra a rede carregada (`NetworkMapRepository`) e **conferidas de novo no
backend**.

- **Reconhecer:** mesmo **tipo** e mesmo **nome** (comparação sem acento, sem diferença de
  maiúsculas, espaços/hífen/sublinhado normalizados — a função `normalize` já existente). Item **sem
  nome**, ou com nome **repetido** dentro do arquivo no mesmo tipo: reconhecido pela **posição** —
  elemento do mesmo tipo a até **5 m** (cabo: as duas pontas a até 5 m das pontas do existente, em
  qualquer ordem).
- **Já existe na mesma posição** (até 5 m): não é enviado; conta como "já existe".
- **Já existe em outro lugar** (mesmo nome, mais de 5 m): mostrado à parte com a escolha
  **"Atualizar posição"** ou **"Manter como está"** (padrão: manter). Cabo só pode ter o traçado
  atualizado se **nenhuma fibra dele estiver ligada** (o backend recusa; a tela avisa antes quando
  souber).
- **Nunca** se apaga nada por ter sumido do arquivo.
- Mesmo nome mas **tipo diferente** (ex.: no arquivo "CTO-01" escolhido como CEO e no sistema uma
  CTO "CTO-01"): não é duplicado; é criado, com o aviso "já existe uma CTO com este nome" no item.
- Atualizar a posição de uma caixa/OLT **não** redesenha os cabos ligados a ela (o técnico ajusta o
  traçado no mapa, como hoje).
- Itens sem nome recebem nome gerado: "CTO importada 1", "Cabo importado 1"… (o backend exige nome).

## Ligação dos cabos às caixas

Opcional, ligada por padrão: para cada cabo importado (novo), a ponta inicial é ligada como START e
a final como END à caixa/OLT (existente ou importada nesta mesma vez) mais próxima **a até 15 m**
daquela ponta. Pontos do meio do traçado **não** geram PASS_THROUGH (seria inferir demais; o técnico
completa na ficha do cabo). A tela mostra quantas ligações serão feitas. Isso é ligação física
(o cabo chega na caixa), não continuidade óptica — que continua sempre explícita.

## Contrato com o backend (o dono implementa)

`POST /api/v1/imports/network` — grava tudo numa transação.

```jsonc
{
  "usageStatus": "INSTALLED",              // situação dos itens novos
  "elements": [                            // caixas e OLTs
    { "ref": "p-12", "action": "CREATE", "kind": "BOX", "type": "CTO",
      "name": "CTO-001", "description": "texto opcional",
      "location": { "longitude": -51.57, "latitude": -10.65 } },
    { "ref": "p-40", "action": "CREATE", "kind": "OLT", "name": "OLT-CENTRO", "location": { … } },
    { "ref": "p-77", "action": "MOVE", "kind": "BOX", "id": "uuid-existente",
      "location": { … } }
  ],
  "cables": [
    { "ref": "l-3", "action": "CREATE", "name": "CABO-01", "role": "DISTRIBUTION",
      "fiberCapacity": 12, "coordinates": [ { … }, { … } ],
      "start": { "ref": "p-12" },          // ou { "boxId": "uuid" } / { "oltId": "uuid" } / ausente
      "end":   { "boxId": "uuid-existente" } },
    { "ref": "l-9", "action": "RESHAPE", "id": "uuid-existente", "coordinates": [ … ] }
  ]
}
```

Regras do backend:
- Tudo ou nada (uma transação). Limite: 10.000 itens por requisição (acima → 400).
- `CREATE` com mesmo tipo e nome normalizado de um elemento existente, ou duplicado dentro da
  própria requisição → **409** com a lista de `ref` em conflito (o front recalcula e mostra).
- `MOVE` / `RESHAPE` de `id` inexistente → 404; `RESHAPE` de cabo com fibra ligada → 409.
- Validações usuais (nome, coordenadas, ≥ 2 pontos no cabo, `fiberCapacity` > 0) → 400 com
  `errors` apontando o `ref`.
- `start`/`end` criam `CableAttachment` START/END; `ref` aponta para um elemento da mesma
  requisição.
- Resposta **201**:
  `{ "created": { "boxes": 180, "olts": 1, "cables": 340, "attachments": 287 },
     "moved": 2, "reshaped": 0, "ids": { "p-12": "uuid", "l-3": "uuid", … } }`.
- Mensagens de erro em `detail` (inglês, como o resto); o front traduz em `error-messages.ts`.

## Partes do frontend (decididas)

- Leitura do arquivo em regras puras, com teste primeiro (`core/import/`): descompactar KMZ, ler o
  KML (`DOMParser`), resolver estilos (`Style`, `StyleMap` → normal, cores `aabbggrr`), caminho de
  pastas, `Point`/`LineString`/`MultiGeometry`, coordenadas `lon,lat[,alt]`, nome e descrição
  (HTML → texto); agrupar; reconhecer duplicados; montar o corpo do `POST`.
- Descompactar com **fflate** (pequena, sem dependências). Decisão minha.
- Página `features/network-import/` com a prévia no `app-geo-map` existente.
- Novo recurso de API `resources/import-api.ts` + tipos via `npm run api:types` depois que o
  backend tiver o endpoint.

## O que fica para quem implementar

Divisão interna de componentes, layout exato, ícones, textos de ajuda, como desenhar a prévia
(camadas, cores), desempenho com arquivos grandes (ex.: 20 mil pontos — agrupar em memória e
virtualizar a lista de itens se preciso), tamanho máximo de arquivo aceito na tela.

## Decisões tomadas sem o dono (revisar)

- Clientes fora da importação (exigem contrato e porta).
- Situação padrão dos itens novos: Instalado (trocável na tela).
- Fibras por grupo de linhas: 12 por padrão.
- Ligar pontas dos cabos a caixas/OLTs a até 15 m: ligado por padrão; sem PASS_THROUGH automático.
- Duplicado: mesmo tipo + nome normalizado; sem nome ou nome repetido → posição até 5 m.
- "Já existe em outro lugar": padrão manter; atualizar só se a pessoa escolher.
- Sugestão de tipo pelo nome da pasta/itens, sempre visível e trocável; sem escolha não importa.
- Entrada pelo painel lateral, rota `/importar`; biblioteca fflate.
- Limite de 10.000 itens por requisição.
- Mesmo nome com tipo diferente não é duplicado (cria com aviso).
- Mover caixa/OLT não redesenha os cabos ligados.
