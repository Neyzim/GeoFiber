# Importação de rede (KMZ/KML) — especificação do backend

Data: 2026-11-20 · Para: implementação no `geofiber-backend` · Origem: design do front em
`docs/superpowers/specs/2026-11-20-importar-kmz-design.md`.

O front lê o arquivo KMZ/KML no navegador, agrupa os itens, a pessoa escolhe o tipo de cada um e o
front envia **uma lista pronta**. O backend grava tudo numa transação e confere de novo os duplicados.
O backend não lê arquivo nenhum.

## 1. Endpoint

`POST /api/v1/imports/network` · `Content-Type: application/json` · resposta `201 Created`.

Permissão: a mesma de criar elementos. (A autenticação ainda não existe; quando existir, seguir o
padrão dos outros endpoints de escrita.)

## 2. Requisição

```jsonc
{
  "usageStatus": "INSTALLED",               // situação dos itens criados. Obrigatório.
  "elements": [                             // caixas e OLTs
    {
      "ref": "p-12",                        // obrigatório, único dentro da requisição
      "action": "CREATE",                   // CREATE | MOVE
      "kind": "BOX",                        // BOX | OLT
      "type": "CTO",                        // só para BOX: CTO | CEO | DIO
      "name": "CTO-001",                    // obrigatório em CREATE
      "description": "Rua A, 10",           // opcional
      "location": { "longitude": -51.57, "latitude": -10.65 }
    },
    {
      "ref": "p-77",
      "action": "MOVE",                     // mover elemento que já existe
      "kind": "BOX",
      "id": "uuid-existente",               // obrigatório em MOVE
      "location": { "longitude": -51.58, "latitude": -10.66 }
    }
  ],
  "cables": [
    {
      "ref": "l-3",
      "action": "CREATE",                   // CREATE | RESHAPE
      "name": "CABO-01",                    // obrigatório em CREATE
      "role": "DISTRIBUTION",               // BACKBONE | FEEDER | DISTRIBUTION | DROP | INTERCONNECTION
      "fiberCapacity": 12,                  // obrigatório em CREATE, inteiro > 0
      "description": "opcional",
      "coordinates": [                      // mínimo 2 pontos, na ordem do traçado
        { "longitude": -51.57, "latitude": -10.65 },
        { "longitude": -51.58, "latitude": -10.66 }
      ],
      "start": { "ref": "p-12" },           // ponta inicial (opcional). Ver §5
      "end":   { "boxId": "uuid-existente" } // ponta final (opcional). Ver §5
    },
    {
      "ref": "l-9",
      "action": "RESHAPE",                  // trocar só o traçado de cabo existente
      "id": "uuid-existente",               // obrigatório em RESHAPE
      "coordinates": [ /* ... */ ]
    }
  ]
}
```

Notas sobre o que o front manda (fixo, não mudar sem avisar o front):

- Em `CREATE` o front **sempre** envia `name` (quando o item não tem nome no arquivo, o front gera
  um nome livre: "CTO importada 1", "Cabo importado 1"…). O backend não gera nome.
- `type` nunca é `OLT` nem um papel de cabo. `role` nunca é `null` em `CREATE`.
- `description` só vem quando o item tinha descrição no arquivo (texto puro, sem HTML).
- `ref` é uma string livre escolhida pelo front (ex.: `p-12`, `l-3-1`). Só vale dentro da requisição.
- Coordenadas vêm no formato `{longitude, latitude}` (padrão do backend).

## 3. Regras de validação

Tudo acontece antes de gravar qualquer coisa. Qualquer falha cancela a transação inteira.

| Regra | Resposta |
|---|---|
| Total de itens (`elements` + `cables`) > 10.000 | `400` · `Import exceeds 10000 items` |
| `ref` repetido na requisição (entre elementos e cabos) | `400` |
| `CREATE` sem `name` (vazio ou só espaços, após trim) | `400` (use as mesmas regras de validação do cadastro normal) |
| `kind=BOX` sem `type`, ou `type` fora de CTO/CEO/DIO | `400` |
| `kind=OLT` com `type` | `400` |
| Latitude fora de [-90, 90] ou longitude fora de [-180, 180] | `400` |
| Cabo com menos de 2 pontos em `coordinates` | `400` |
| `CREATE` de cabo sem `role` válido ou `fiberCapacity` ≤ 0 | `400` |
| `MOVE` ou `RESHAPE` sem `id` | `400` |
| `MOVE` de `id` inexistente (ou de tipo diferente de `kind`) | `404` |
| `RESHAPE` de `id` de cabo inexistente | `404` |
| `RESHAPE` de cabo com fibra ligada (qualquer ponta de fibra com conexão/fusão/splitter/porta) | `409` · `Cable has connected fibers and cannot be reshaped` |
| `CREATE` cujo tipo + nome normalizado já existe na rede | `409` · `Import has elements that already exist` |
| Dois `CREATE` do mesmo tipo com o mesmo nome normalizado **dentro da mesma requisição** | `409` · `Import has elements that already exist` |
| `start`/`end` com `ref` que não é `CREATE` de elemento desta requisição | `400` |
| `start`/`end` com `boxId`/`oltId` inexistente | `400` |
| `start`/`end` com mais de uma chave (ex.: `ref` e `boxId`) | `400` |

Nome normalizado = mesma função de normalização usada no cadastro (sem acento, minúsculas, `-` e `_`
viram espaço, espaços das pontas removidos). Tipo: para caixas, o `type`; para OLT, `OLT`.

## 4. Gravação

1. Validar tudo (seção 3). Conferir duplicados **dentro da transação**, lendo a rede atual.
2. Criar os elementos `CREATE` (caixas e OLTs). Situação = `usageStatus` (padrão do cadastro quando
   ausente, mas o front sempre envia).
3. Mover os `MOVE` (só a localização).
4. Criar os cabos `CREATE` com `fiberCapacity` e `role`. As fibras e tubos **não** são criados aqui
   (o cabo nasce sem estrutura, como no cadastro normal, e o técnico cadastra tubos depois).
5. Trocar o traçado dos cabos `RESHAPE`.
6. Criar as pontas (`CableAttachment`): `start` → papel `START`, `end` → papel `END`, para cada cabo
   `CREATE`. Ver §5.
7. Confirmar a transação. Se qualquer passo falhar, desfazer tudo.

Não apagar nada. Não criar fibra, tubo, fusão, splitter, porta ou cliente.

## 5. Pontas do cabo (`start` / `end`)

Cada ponta aponta para **um** destino:

- `{ "ref": "p-12" }` — elemento `CREATE` desta mesma requisição (caixa ou OLT).
- `{ "boxId": "uuid" }` — caixa existente.
- `{ "oltId": "uuid" }` — OLT existente.
- Ausente — sem ponta (o cabo fica sem ligação física).

Papel gravado: `start` → `START`, `end` → `END`. Ligação física apenas. Não criar `PASS_THROUGH`
nem qualquer conexão óptica. A ponta pode ficar ausente sem erro.

## 6. Resposta `201 Created`

```json
{
  "created": { "boxes": 180, "olts": 1, "cables": 340, "attachments": 287 },
  "moved": 2,
  "reshaped": 0,
  "ids": { "p-12": "uuid-novo", "l-3": "uuid-novo", "p-77": "uuid-existente" }
}
```

- `created.boxes` conta caixas criadas (não OLTs); `created.olts` conta OLTs criadas.
- `moved` = `MOVE` feitos; `reshaped` = `RESHAPE` feitos.
- `ids` traz o `uuid` de **todo** `ref` (criados e movidos/reshaped), para o front conferir.

## 7. Erros (ProblemDetail)

Mantém o padrão ProblemDetail do projeto. O campo `detail` é em **inglês, texto exato** (o front
traduz por este texto): os três textos da tabela da seção 3.

Para erros de validação de itens (`400`), incluir a lista de itens afetados em `errors`:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid import",
  "errors": [ { "ref": "p-12", "field": "name", "message": "must not be blank" } ]
}
```

`errors` é opcional para o front (ele hoje só usa `detail`), mas facilita o diagnóstico.

## 8. Concorrência e consistência

- A checagem de duplicados e a gravação ficam **na mesma transação**. Quem importa ao mesmo tempo
  pode gerar 409; o front então recarrega e recalcula.
- Não é preciso alterar o banco (sem Flyway novo). Se quiser garantir unicidade, pode-se criar índice
  único parcial em `(tipo, nome normalizado)` por elemento ativo, mas isso muda o contrato de nomes
  de todo o sistema: decisão do dono, não obrigatória agora.
- Em 409 de duplicado, a transação inteira é desfeita. Nenhum item parcial fica gravado.

## 9. Testes que o backend deve ter

Testes de integração (Testcontainers com PostGIS, como o resto do projeto):

1. Importa caixas, OLT e cabos novos; confere os contadores, `ids` e os elementos gravados.
2. Ponta `start`/`end` por `ref`, por `boxId`, por `oltId` e ausente; confere papéis `START`/`END`.
3. `MOVE` atualiza a localização e mantém o `id`.
4. `RESHAPE` troca o traçado; com fibra ligada, `409` com o texto exato e nada gravado.
5. `CREATE` com nome já existente no mesmo tipo → `409` e nada gravado (teste de tudo ou nada: um
   item válido antes do duplicado não pode ficar gravado).
6. Dois `CREATE` iguais na mesma requisição → `409`.
7. Mesmo nome com tipo diferente → cria (não é duplicado).
8. `ref` repetido, `ref` de ponta desconhecido, coordenada inválida, cabo com 1 ponto → `400`.
9. Mais de 10.000 itens → `400` com `Import exceeds 10000 items`.
10. `MOVE` de id inexistente → `404`.

## 10. Depois de publicar

Avisar o front. O front então roda `npm run api:types` (com o backend em `localhost:8080`) e troca
`src/app/core/api/import-types.ts` pelos tipos gerados. Os nomes dos campos já batem com o contrato
acima, então a troca não muda o comportamento.
