# Importar rede de KMZ/KML — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/importar` que lê um KMZ/KML no navegador, agrupa os itens, deixa a pessoa decidir o tipo de cada grupo (ou item), reconhece o que já existe, mostra a prévia no mapa e grava tudo de uma vez pelo endpoint novo do backend.

**Architecture:** Regras puras em `src/app/core/import/` (ler arquivo → ler KML → agrupar → reconhecer duplicados → montar o pedido), um serviço de API, um store da página e a página em `src/app/features/network-import/`. O backend (o dono implementa) recebe uma lista pronta e grava numa transação.

**Tech Stack:** Angular 22 (standalone, signals, zoneless, OnPush), Angular Material, Leaflet (via `app-geo-map`), Vitest via `ng test`, `fflate` para descompactar.

**Spec:** `docs/superpowers/specs/2026-11-20-importar-kmz-design.md`

> **Estado da execução (2026-11-20):** tarefas 1 a 9 concluídas, inline, com TDD; suíte 74 arquivos /
> 414 testes e build ok. Tarefa 10 (documentação, `docs/*`, `README.md`, `CLAUDE.md`) em andamento.
> Pendências: endpoint `POST /imports/network` no backend e conferência no navegador.

## Global Constraints

- **Sem Git:** nada de `add`/`commit`; cada tarefa termina num passo "Registrar" com a mensagem sugerida (o dono faz o commit).
- TDD: teste → ver falhar → código → ver passar; no fim de cada tarefa, `npx ng test --watch=false` inteiro (procurar também "Unhandled") e `npx ng build`.
- Textos de tela em pt-BR simples; nenhum código do backend (`BOX`, `DISTRIBUTION`, `INSTALLED`…) na tela.
- Tipos seguem o backend. O endpoint ainda não existe: os tipos do pedido ficam escritos à mão em `src/app/core/api/import-types.ts` **com exatamente os nomes do contrato do spec**, e viram apelidos de `generated/schema.d.ts` depois que o dono publicar o endpoint (`npm run api:types`).
- Distâncias: **5 m** (mesmo elemento), **15 m** (ligar ponta de cabo), limite **10.000** itens por pedido, fibras padrão **12**, situação padrão dos novos **INSTALLED** ("Instalado").
- Nomes gerados: "CTO importada N", "CEO importada N", "DIO importado N", "OLT importada N", "Cabo importado N" (N conta a partir de 1 por tipo, na ordem do arquivo).
- Só com `NetworkMapState.canEdit()`.
- Specs de componentes com Material: `describe(..., { timeout: 20000 }, ...)`.
- Mensagens `detail` do backend que o front traduz (o dono usa exatamente estes textos):
  - `Import has elements that already exist` → "Alguns itens já existem na rede (alguém importou antes?). Conferimos de novo: revise e importe outra vez."
  - `Import exceeds 10000 items` → "O arquivo tem itens demais para uma importação (máximo 10.000). Divida o arquivo."
  - `Cable has connected fibers and cannot be reshaped` → "Um cabo com fibras ligadas não pode ter o traçado trocado. Deixe-o como está."

## Review Focus

1. **Arquivo grande** (20 mil postes num grupo): abrir o grupo não pode desenhar 20 mil linhas — no máximo 200 itens e "Mostrar mais 200". Teste na Task 8.
2. **KML com namespace diferente** (`http://earth.google.com/kml/2.1`, sem namespace, `gx:`): o leitor casa as tags pelo `localName`, não pelo namespace. Teste na Task 2.
3. **Arquivo em ISO-8859-1/Windows-1252** (comum em exports antigos): nomes com acento devem sair certos; o arquivo é decodificado pelo `encoding` declarado no cabeçalho XML. Teste na Task 1.
4. **Geometria ruim:** coordenadas com quebras de linha/tabs/altitude, coordenada inválida, linha com 1 ponto (ou pontos repetidos em sequência): o item é pulado e conta num aviso, o resto importa. Teste na Task 2.
5. **Conflito no envio (409)** porque alguém importou antes: a rede recarrega, os duplicados são recalculados, as escolhas da pessoa ficam. Teste na Task 7.

---

### Task 1: Abrir o arquivo (KMZ ou KML)

**Files:**
- Modify: `package.json` (dependência `fflate@0.8.2`)
- Create: `src/app/core/import/network-file.ts`
- Test: `src/app/core/import/network-file.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface NetworkFile { fileName: string; kml: string; icons: ReadonlyMap<string, Blob>; }
  export class NetworkFileError extends Error {} // message já em pt-BR
  export function openNetworkFile(name: string, bytes: Uint8Array): NetworkFile;
  export async function readNetworkFile(file: File): Promise<NetworkFile>; // lê bytes e chama openNetworkFile
  ```

- [ ] **Step 1: Instalar** — `npm install fflate@0.8.2 --save-exact`. Expected: `package.json` com `"fflate": "0.8.2"`.
- [ ] **Step 2: Testes que falham** (`network-file.spec.ts`; monte KMZs com `zipSync` do fflate e `strToU8`):
  - `opens a plain KML` — `openNetworkFile('rede.kml', strToU8('<kml>…</kml>')).kml` contém `<kml`; `icons.size === 0`.
  - `takes doc.kml from a KMZ, or the first .kml when there is no doc.kml` — zip com `files/x.kml` e `doc.kml` → usa `doc.kml`; zip só com `a/rede.kml` → usa esse.
  - `keeps the images of a KMZ as icons by path` — zip com `doc.kml` e `files/cto.png` → `icons.has('files/cto.png')`.
  - `decodes the encoding declared in the XML` — bytes de `<?xml version="1.0" encoding="ISO-8859-1"?><kml><name>Caixa São João</name></kml>` em latin1 (`Uint8Array.from('…', c => c.charCodeAt(0))`) → `kml` contém `São João`.
  - `explains a broken file` — bytes aleatórios com nome `.kmz` → lança `NetworkFileError` com `'Este arquivo não é um KMZ/KML válido.'`; zip sem `.kml` → `'O KMZ não tem nenhum KML dentro.'`; extensão `.txt` → `'Escolha um arquivo .kmz ou .kml.'`.
- [ ] **Step 3: Rodar** `npx ng test --watch=false --include src/app/core/import/network-file.spec.ts` — Expected: FAIL (módulo inexistente).
- [ ] **Step 4: Implementar** — KMZ = começa com `PK` ou extensão `.kmz`; `unzipSync`; decodificar com `TextDecoder(label)` onde `label` vem de `/encoding=["']([^"']+)/` nos primeiros 200 bytes (padrão `utf-8`; label inválido → `utf-8`).
- [ ] **Step 5: Rodar de novo** — Expected: PASS.
- [ ] **Step 6: Registrar** — `feat: open KMZ and KML files in the browser`

---

### Task 2: Ler o KML (pontos, linhas, pastas, estilos)

**Files:**
- Create: `src/app/core/import/kml-reader.ts`
- Test: `src/app/core/import/kml-reader.spec.ts`

**Interfaces:**
- Consumes: `NetworkFile.kml` (Task 1); `GeoPoint` de `core/models/geo.model`.
- Produces:
  ```ts
  export interface KmlStyle { iconHref?: string; iconColor?: string; lineColor?: string; lineWidth?: number; } // cores '#rrggbb'
  export type KmlGeometry = { kind: 'point'; point: GeoPoint } | { kind: 'line'; points: GeoPoint[] };
  export interface KmlPlacemark { ref: string; name: string; description: string; folderPath: readonly string[]; geometry: KmlGeometry; style: KmlStyle; }
  export interface KmlReadResult { placemarks: KmlPlacemark[]; warnings: string[]; }
  export function readKml(kml: string): KmlReadResult; // lança NetworkFileError em XML inválido
  ```
  `ref`: `p-<n>` para pontos e `l-<n>` para linhas, `n` na ordem do documento a partir de 1; `MultiGeometry` gera um item por geometria com `ref` sufixado `-1`, `-2` e o mesmo nome.

- [ ] **Step 1: Testes que falham** (`kml-reader.spec.ts`):
  - `reads points and lines with name, folder path and description as text` — Folder "Rede" › Folder "CTOs" › Placemark "CTO-001" `<Point><coordinates>-51.57,-10.65,0</coordinates>` com `<description><![CDATA[<b>Rua A</b>]]>` → `{ ref: 'p-1', name: 'CTO-001', folderPath: ['Rede','CTOs'], description: 'Rua A', geometry: { kind:'point', point:{ lat:-10.65, lng:-51.57 } } }`.
  - `resolves shared styles, StyleMap (normal) and inline styles; converts aabbggrr` — `<Style id="s"><IconStyle><color>ff0000ff</color><Icon><href>files/cto.png</href></Icon></IconStyle><LineStyle><color>ff00ff00</color><width>3</width></LineStyle></Style>`, `<StyleMap id="m"><Pair><key>normal</key><styleUrl>#s</styleUrl></Pair></StyleMap>`, placemark com `styleUrl #m` → `style = { iconHref:'files/cto.png', iconColor:'#ff0000', lineColor:'#00ff00', lineWidth:3 }`; estilo inline vence o compartilhado.
  - `matches tags by local name whatever the namespace` — mesmo documento com `xmlns="http://earth.google.com/kml/2.1"` e sem namespace dá o mesmo resultado.
  - `splits a MultiGeometry into one item per geometry` — 2 `LineString` → refs `l-1-1`, `l-1-2`.
  - `skips bad geometry and warns` — coordenadas com `\n\t` e altitude são lidas; `abc,def` pulado; linha com 1 ponto (ou só pontos repetidos) pulada → `warnings` contém `'2 itens com coordenadas inválidas foram ignorados.'`.
  - `ignores polygons and network links with a warning` — 1 `Polygon` e 1 `NetworkLink` → `'1 área (polígono) foi ignorada.'` e `'1 link de rede foi ignorado.'` (plural: "N áreas (polígonos) foram ignoradas.", "N links de rede foram ignorados.").
  - `explains invalid XML` — `'<kml><Placemark>'` → lança com `'Este arquivo não é um KMZ/KML válido.'`; documento sem pontos nem linhas → `'Nenhum ponto ou linha encontrado no arquivo.'`.
- [ ] **Step 2: Rodar** `npx ng test --watch=false --include src/app/core/import/kml-reader.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implementar** `readKml` com `DOMParser('application/xml')` (`parsererror` = inválido), percorrendo elementos e comparando `localName`. Descrição HTML → texto via `DOMParser('text/html').body.textContent`, espaços colapsados. Linhas: remover pontos consecutivos iguais antes de checar `>= 2`.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: read placemarks, folders and styles from KML`

---

### Task 3: Agrupar e sugerir o tipo

**Files:**
- Create: `src/app/core/import/import-groups.ts`
- Test: `src/app/core/import/import-groups.spec.ts`

**Interfaces:**
- Consumes: `KmlPlacemark`, `KmlStyle` (Task 2); `normalize` de `core/network/network-map-state`; `BoxType`, `CableRole` de `core/api/api-types`.
- Produces:
  ```ts
  export type PointTarget = BoxType | 'OLT' | 'IGNORE';
  export type LineTarget = CableRole | 'IGNORE';
  export type ImportTarget = PointTarget | LineTarget;
  export interface ImportGroup { key: string; geometry: 'point' | 'line'; label: string; style: KmlStyle; items: KmlPlacemark[]; }
  export function groupPlacemarks(placemarks: readonly KmlPlacemark[]): ImportGroup[];
  export function suggestTarget(group: ImportGroup): PointTarget | null;
  export const POINT_TARGETS: readonly { target: PointTarget; label: string }[]; // CTO, CEO, DIO, OLT, Ignorar
  export const LINE_TARGETS: readonly { target: LineTarget; label: string }[];   // Backbone, Alimentação, Distribuição, Drop, Interconexão, Ignorar
  ```
  `key`: pontos `point|<pasta/…>|<iconHref>|<iconColor>`; linhas `line|<pasta/…>|<lineColor>|<lineWidth>`. `label`: última pasta, ou "Sem pasta". Ordem: pontos antes de linhas, depois pela ordem do primeiro item no arquivo. Rótulos das funções de cabo vêm de `roleDefinition` (`network-catalog`).

- [ ] **Step 1: Testes que falham**:
  - `groups points by folder and icon, and lines by folder, color and width` — 3 pontos (2 com mesmo ícone/pasta) + 2 linhas de cores diferentes → 4 grupos; tamanhos `[2,1,1,1]`.
  - `names a group after its last folder` — `['Rede','CTOs']` → `'CTOs'`; sem pasta → `'Sem pasta'`.
  - `suggests the type from the folder or from most item names` — pasta "CTOs Centro" → `'CTO'`; pasta "Caixas" com 3 itens "CEO-1","CEO-2","X" → `'CEO'`; "OLT Matriz" → `'OLT'`; pasta "Postes" → `null`; grupo de linha → `null`.
- [ ] **Step 2: Rodar** `npx ng test --watch=false --include src/app/core/import/import-groups.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implementar** — sugestão: primeira palavra normalizada da pasta, ou de mais da metade dos nomes, ∈ {cto, ceo, dio, olt}.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: group imported placemarks and suggest their type`

---

### Task 4: Reconhecer o que já existe

**Files:**
- Create: `src/app/core/network/geo-distance.ts` (move `distanceMeters` de `customer-rules.ts` e exporta)
- Modify: `src/app/core/network/customer-rules.ts` (importa de `geo-distance`)
- Create: `src/app/core/import/import-match.ts`
- Test: `src/app/core/import/import-match.spec.ts`, `src/app/core/network/geo-distance.spec.ts`

**Interfaces:**
- Consumes: `KmlPlacemark` (Task 2), `ImportTarget` (Task 3), `MapElement`, `MapCable` (`core/network/map-element`).
- Produces:
  ```ts
  export function distanceMeters(a: GeoPoint, b: GeoPoint): number; // geo-distance.ts
  export const SAME_PLACE_METERS = 5;
  export type ImportMatch =
    | { status: 'new'; nameTakenByOtherType?: string }       // ex.: 'CTO' (rótulo)
    | { status: 'same'; id: string }
    | { status: 'moved'; id: string; kind: 'olt' | 'box' | 'cable' };
  export interface ExistingNetwork { elements: readonly MapElement[]; cables: readonly MapCable[]; }
  export function matchPlacemarks(items: readonly { placemark: KmlPlacemark; target: ImportTarget }[], network: ExistingNetwork): ReadonlyMap<string, ImportMatch>; // chave = ref; itens IGNORE não entram
  ```

- [ ] **Step 1: Testes que falham** (`geo-distance.spec.ts`: 0,001° de latitude ≈ 111 m ±1; `import-match.spec.ts`):
  - `recognizes the same name and type in the same place` — rede com CTO "CTO-001" em P; item "cto 001" (CTO) a 3 m → `same`.
  - `marks a known name in another place as moved` — mesmo item a 40 m → `moved`, `kind:'box'`.
  - `uses the position when the name is empty or repeated in the file` — item sem nome a 3 m de uma CEO → `same`; dois itens "CTO" no arquivo, um a 2 m de uma CTO existente → esse `same`, o outro `new`.
  - `does not mix types, but warns about a name taken by another type` — item "CTO-01" como CEO e existe CTO "CTO-01" → `{ status:'new', nameTakenByOtherType:'CTO' }`.
  - `recognizes cables by name, or by both ends in any order` — cabo "CABO-01" com pontas a 2 m (invertidas) → `same`; sem nome com pontas a 2 m → `same`; mesmo nome, pontas a 30 m → `moved`, `kind:'cable'`.
  - `OLT targets compare with OLTs, box targets with boxes of that type`.
- [ ] **Step 2: Rodar** os dois specs — Expected: FAIL.
- [ ] **Step 3: Implementar** — nome comparado com `normalize`; nome vazio ou repetido (no arquivo, mesmo alvo) → posição; tipo do elemento existente: `group` (`olt`, `CTO`, `CEO`, `DIO`).
- [ ] **Step 4: Rodar de novo** + `customer-rules.spec.ts` — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: recognize imported items that already exist`

---

### Task 5: Montar o pedido de importação

**Files:**
- Create: `src/app/core/api/import-types.ts` (tipos do contrato, à mão)
- Create: `src/app/core/import/import-request.ts`
- Test: `src/app/core/import/import-request.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–4; `toCoordinate` (ou o conversor de coordenadas já existente em `core/api/coordinates.ts`).
- Produces:
  ```ts
  // import-types.ts — nomes idênticos ao contrato do spec
  export interface ImportEnd { ref?: string; boxId?: string; oltId?: string; }
  export interface ImportElement { ref: string; action: 'CREATE' | 'MOVE'; kind: 'BOX' | 'OLT'; id?: string; type?: BoxType; name?: string; description?: string; location: CoordinateDto; }
  export interface ImportCable { ref: string; action: 'CREATE' | 'RESHAPE'; id?: string; name?: string; role?: CableRole; fiberCapacity?: number; description?: string; coordinates: CoordinateDto[]; start?: ImportEnd; end?: ImportEnd; }
  export interface ImportNetworkRequest { usageStatus: InfrastructureStatus; elements: ImportElement[]; cables: ImportCable[]; }
  export interface ImportNetworkResponse { created: { boxes: number; olts: number; cables: number; attachments: number }; moved: number; reshaped: number; ids: Record<string, string>; }

  // import-request.ts
  export interface ImportChoices {
    groups: ReadonlyMap<string, { target: ImportTarget | null; fiberCapacity: number }>; // por ImportGroup.key
    items: ReadonlyMap<string, ImportTarget>;   // troca individual por ref
    moves: ReadonlySet<string>;                 // refs 'moved' que a pessoa mandou atualizar
    usageStatus: InfrastructureStatus;          // padrão 'INSTALLED'
    linkCableEnds: boolean;                     // padrão true
  }
  export const DEFAULT_FIBERS = 12; export const LINK_END_METERS = 15; export const MAX_IMPORT_ITEMS = 10000;
  export function targetOf(group: ImportGroup, placemark: KmlPlacemark, choices: ImportChoices): ImportTarget | null;
  export interface ImportSummary { create: number; same: number; moved: number; update: number; attachments: number; ignored: number; undecidedGroups: number; total: number; }
  export function buildImport(groups: readonly ImportGroup[], choices: ImportChoices, matches: ReadonlyMap<string, ImportMatch>, network: ExistingNetwork): { request: ImportNetworkRequest; summary: ImportSummary };
  ```

- [ ] **Step 1: Testes que falham**:
  - `creates new points and lines with the chosen type, status and fibers` — grupo CTO com 2 novos + grupo de linhas Distribuição com fibras 24 → 2 `elements` `CREATE`/`BOX`/`CTO`, 1 `cable` com `role:'DISTRIBUTION'`, `fiberCapacity:24`; `usageStatus:'INSTALLED'`.
  - `names nameless items per type in file order` — 2 CTOs sem nome e 1 cabo sem nome → `'CTO importada 1'`, `'CTO importada 2'`, `'Cabo importado 1'`.
  - `applies an individual change over the group` — `items.set('p-2','CEO')` → `p-2` sai como CEO; `items.set('p-3','IGNORE')` → não sai.
  - `skips what already exists and only moves what the person chose` — `same` não sai; `moved` sem estar em `moves` não sai; em `moves` → `MOVE` com `id` (ou `RESHAPE` para cabo).
  - `links new cable ends to the nearest box or OLT within 15 m` — ponta inicial a 10 m de uma CTO existente → `start:{ boxId }`; ponta final a 8 m de uma CTO nova `p-1` → `end:{ ref:'p-1' }`; ponta a 20 m → sem `end`; `linkCableEnds:false` → nenhum; `summary.attachments` conta.
  - `counts everything for the screen` — `summary` com `create`, `same`, `moved`, `update`, `ignored`, `undecidedGroups` (grupos com `target: null`), `total = create + update`.
- [ ] **Step 2: Rodar** `npx ng test --watch=false --include src/app/core/import/import-request.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implementar** — ligação só para cabos `CREATE`; candidatos = elementos existentes (`olt`/caixas) + pontos `CREATE` deste pedido; o mais próximo a ≤ 15 m.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: build the network import request`

---

### Task 6: Serviço de API e mensagens de erro

**Files:**
- Create: `src/app/core/api/resources/import-api.ts`
- Test: `src/app/core/api/resources/import-api.spec.ts`
- Modify: `src/app/core/api/error-messages.ts`, `src/app/core/api/api-error.spec.ts`

**Interfaces:**
- Produces: `ImportApi.importNetwork(body: ImportNetworkRequest): Observable<ImportNetworkResponse>` → `POST /imports/network`.

- [ ] **Step 1: Testes que falham** — `describeEndpoints(ImportApi, [{ name:'importNetwork', method:'POST', path:'/imports/network', body, call: api => api.importNetwork(body) }])`; em `api-error.spec.ts`, os três `detail` das Global Constraints viram as frases em pt-BR exatas.
- [ ] **Step 2: Rodar** os dois specs — Expected: FAIL.
- [ ] **Step 3: Implementar** o serviço (padrão de `splice-api.ts`) e as três traduções.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: add network import API client`

---

### Task 7: Store da importação

**Files:**
- Create: `src/app/features/network-import/network-import-store.ts`
- Test: `src/app/features/network-import/network-import-store.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–6; `NetworkMapRepository` (`elements()`, `mapCables()`, `load()`, `loadState()`), `NotificationService`.
- Produces (`@Injectable()`, provido pela página):
  ```ts
  type ImportState = 'empty' | 'reading' | 'ready' | 'saving' | 'done';
  state: Signal<ImportState>; fileName: Signal<string>; error: Signal<string | null>; warnings: Signal<string[]>;
  groups: Signal<ImportGroup[]>; choices: Signal<ImportChoices>; matches: Signal<ReadonlyMap<string, ImportMatch>>;
  summary: Signal<ImportSummary>; result: Signal<ImportNetworkResponse | null>; icons: Signal<ReadonlyMap<string, string>>; // href → object URL
  open(file: File): Promise<void>;
  setGroupTarget(key: string, target: ImportTarget): void; setGroupFibers(key: string, fibers: number): void;
  setItemTarget(ref: string, target: ImportTarget | null): void; // null = volta ao do grupo
  setMove(ref: string, update: boolean): void; setUsageStatus(status: InfrastructureStatus): void; setLinkCableEnds(on: boolean): void;
  submit(): void; reset(): void;
  ```
  `open` aplica `suggestTarget` como escolha inicial de cada grupo de pontos (linhas: `null`), fibras 12. `matches` é `computed` sobre a rede do repositório (recalcula sozinho quando a rede recarrega). `reset` revoga as object URLs.

- [ ] **Step 1: Testes que falham** (repositório e API falsos; `File` montado com `new File([bytes], 'rede.kml')`):
  - `reads a file, groups it and suggests types` — estado `ready`, grupos, escolha inicial `CTO` para pasta "CTOs".
  - `shows the reading error and stays empty` — arquivo inválido → `error()` com a frase da Task 1, `state()==='empty'`.
  - `blocks the import while a group has no choice` — `summary().undecidedGroups > 0`; `submit()` não chama a API.
  - `sends one request, reloads the network and keeps the result` — escolhas completas → `importNetwork` chamado 1 vez com o `request` da Task 5; sucesso → `repository.load()` chamado, `state()==='done'`, `result()` preenchido, aviso de sucesso.
  - `on 409 reloads, recomputes the duplicates and keeps the choices` — API devolve 409 com o `detail` de duplicados → `error()` com a frase traduzida, `repository.load()` chamado, `state()==='ready'`, escolhas iguais; após a rede falsa passar a conter o elemento, `matches()` o marca `same`.
  - `refuses more than 10.000 items` — `summary().total > 10000` → `submit()` não chama a API e `error()` = "O arquivo tem itens demais…".
- [ ] **Step 2: Rodar** — Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: add network import store`

---

### Task 8: Página de importação (arquivo, grupos, itens, importar)

**Files:**
- Create: `src/app/features/network-import/network-import-page.{ts,html,scss}`, `import-group-row.{ts,html,scss}`
- Test: `src/app/features/network-import/network-import-page.spec.ts`, `import-group-row.spec.ts`
- Modify: `src/app/app.routes.ts` (rota lazy `importar`, título `'GeoFiber — Importar rede'`), `src/app/features/network-map/network-sidebar/network-sidebar.html` (item "Importar KMZ/KML" · "Traga a rede de outro sistema", ícone `upload_file`, só com `canEdit`)

**Interfaces:**
- Consumes: `NetworkImportStore` (Task 7), `NetworkMapState.canEdit`, `POINT_TARGETS`/`LINE_TARGETS` (Task 3).
- Produces: `ImportGroupRowComponent` (`app-import-group-row`; input `group: ImportGroup`); `NetworkImportPage` (provê o store).

- [ ] **Step 1: Testes que falham** (store falso com signals):
  - página: `asks for a file first` (texto "Solte aqui um arquivo .kmz ou .kml" + botão "Escolher arquivo"); `shows the reading error`; `lists point groups before line groups with counts and sample names` ("212 itens: 180 novos · 30 já existem · 2 mudaram de lugar" e "CTO-001, CTO-002, CTO-003 …"); `disables Importar until every group has a choice` (texto do botão "Importar 602 itens"); `shows the result and a button to see it on the map`; `says there is no permission without canEdit` ("Sem permissão para importar").
  - linha do grupo: `changes the type of the group` (chama `setGroupTarget`); `asks for the fiber count only for cable types`; `opens the group and lists items by name, "(sem nome)" when empty`; `changes one item and can send it back to the group` (`setItemTarget(ref,'CEO')`, depois `null`); `offers "Atualizar posição" only for moved items` (`setMove`); `shows the warning of a name taken by another type` ("já existe uma CTO com este nome"); `renders at most 200 items and a "Mostrar mais 200" button` (grupo com 500 itens → 200 linhas; clicar → 400) — **Review Focus 1**.
- [ ] **Step 2: Rodar** os dois specs — Expected: FAIL.
- [ ] **Step 3: Implementar** — layout do spec (desenho em "2. Escolher o que cada grupo vira"); seletores com `mat-select`; ícone do KMZ pela object URL do store, senão bolinha na cor do estilo; tokens `--gf-*`; resultado: "Importação concluída: …" conforme o spec.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: add network import page`

---

### Task 9: Prévia no mapa e voltar ao mapa enquadrando o importado

**Files:**
- Create: `src/app/core/import/import-preview.ts`, `import-preview.spec.ts`
- Modify: `src/app/core/services/map-return.ts` (+ spec), `src/app/features/network-map/network-map-page.ts` (aplica o enquadramento), `network-import-page.*` (botão "Ver no mapa" da prévia e do resultado)

**Interfaces:**
- Produces:
  ```ts
  export function importPreview(groups, choices, matches, network): { elements: MapElement[]; paths: GeoPath[]; points: GeoPoint[] };
  // novos: cor do tipo escolhido (groupDefinition / cableLineStyle); movidos: na posição nova + GeoPath tracejado '4 6' da antiga para a nova; 'same' e IGNORE ficam de fora
  // MapReturnService: request(target) passa a aceitar também { fit: readonly GeoPoint[] }
  export type MapReturnTarget = { selection: NonNullable<Selection>; focus: boolean } | { fit: readonly GeoPoint[] };
  ```
- [ ] **Step 1: Testes que falham** — `import-preview.spec.ts`: novos viram `MapElement` com `group` do alvo e `key` `import:<ref>`; movido gera elemento + `GeoPath` com `dashArray:'4 6'`; `same`/IGNORE ausentes; `points` = todas as posições mostradas. `map-return.spec.ts`: `request({ fit })` e `take()` devolvem o mesmo alvo. Página: `opens the preview map` (`app-geo-map` aparece com os elementos da prévia).
- [ ] **Step 2: Rodar** — Expected: FAIL.
- [ ] **Step 3: Implementar** — prévia num painel da página com `app-geo-map` (sem edição); mapa da rede: `applyReturn` com `fit` chama `viewport.focusAll(points)`; "Ver no mapa" do resultado envia `fit` com as posições importadas e navega para `/`.
- [ ] **Step 4: Rodar de novo** — Expected: PASS.
- [ ] **Step 5: Registrar** — `feat: preview the import on a map and frame it after importing`

---

### Task 10: Documentação e verificação final

**Files:**
- Modify: `docs/SPECS.md` (§1.1, tabela `core/import` e `features/network-import`, regra RI-35 "Importar KMZ/KML" com grupos, duplicados 5 m, ligação 15 m, tudo-ou-nada), `docs/GUIA.md` (seção "Importar a rede de um KMZ"), `README.md` (pasta `features/network-import`), `CLAUDE.md` (situação, mapa de pastas, decisões do spec), este plano (marcar tarefas).

- [ ] **Step 1:** Atualizar os documentos.
- [ ] **Step 2:** `npx ng test --watch=false` — Expected: todos passando, sem "Unhandled".
- [ ] **Step 3:** `npx ng build` — Expected: sucesso.
- [ ] **Step 4:** Avisar o dono do que o backend precisa (endpoint e os três `detail`) e que, depois dele, `npm run api:types` + trocar `import-types.ts` por apelidos de `generated/schema.d.ts`.
- [ ] **Step 5: Registrar** — `docs: document KMZ/KML network import`
