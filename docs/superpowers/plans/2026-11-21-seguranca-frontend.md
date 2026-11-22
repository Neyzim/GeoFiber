# Segurança no frontend (etapa 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login em `/entrar`, sessão só em memória com refresh por cookie (único em andamento), renovação antes do fim e após 401, logout, guarda das rotas, 401/403 em português e cadastro de usuário pelo ADMIN.

**Architecture:** `core/auth/` concentra a sessão (`AuthSession`, sinais + timer), o cliente dos endpoints de autenticação (`AuthApi`), a leitura do JWT, o interceptor (Bearer, `withCredentials`, 401 → refresh compartilhado → repetir uma vez) e as guardas. A página `features/auth/sign-in-page` faz login e também o aviso de conexão. O menu de conta fica no pé da barra do mapa; o cadastro de usuário é um diálogo em `shared/users/`.

**Tech Stack:** Angular 22 (standalone, signals, OnPush, zoneless), Angular Material, RxJS, Vitest via `ng test`, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-11-21-seguranca-frontend-design.md`

**Situação:** executado em 2026-11-21 (Tasks 1–6, sem commits — o dono commita).

## Global Constraints

- Sem Git para o agente: os passos "Registrar" anotam a mensagem de commit no ledger; o dono commita.
- Token de acesso só em memória; nunca `localStorage`/`sessionStorage`. O JS nunca lê o refresh.
- Toda chamada à API (prefixo `API_BASE_URL`) com `withCredentials: true`; fora de `/auth/*` com `Authorization: Bearer <token>`.
- Um único `POST /auth/refresh` em andamento por vez; repetir a chamada original uma vez só.
- Só 401 do refresh encerra a sessão; erro de rede (status 0) nunca encerra.
- Renovação em `expiresIn − 60` s (mínimo 10 s); falha de rede na renovação agendada → nova tentativa em 30 s.
- Textos exatos: "Sua sessão expirou. Entre novamente." · "Você não tem permissão para fazer isso." · "Informe um e-mail válido." · "Informe a senha." · "A senha precisa ter pelo menos 10 caracteres." · "E-mail já cadastrado." · "Usuário <nome> cadastrado." · papéis "Administrador" (ADMIN) e "Técnico" (MEMBER). Nenhum código do backend na tela.
- `voltar` só aceita caminho que começa com `/` e não com `//`; qualquer outro vira `/`.
- `NetworkMapState.canEdit` continua `true` (o backend decide o dono).
- Specs de componentes Material com `describe(..., { timeout: 20000 }, ...)`; mocks de `NotificationService.apiError` retornam `parseApiError(error)`.
- Docs junto: SPECS, GUIA, README, CLAUDE.

## Review Focus

1. **Várias 401 ao mesmo tempo** (o mapa carrega OLTs, caixas, clientes e cabos juntos): um só refresh, e todas repetem com o token novo. Teste na Task 3.
2. **401 chega enquanto a renovação agendada está em andamento:** a chamada espera o mesmo refresh, sem disparar outro. Teste na Task 2 (`refresh()` duas vezes → um pedido).
3. **Rede cai no refresh:** a sessão continua; o mapa mostra o erro de conexão, não o login. Testes nas Tasks 2 e 3.
4. **`voltar` externo** (`//site.com`, `https://site.com`, `javascript:`): ignorado, vai para `/`. Teste na Task 4.
5. **Repetição volta 401** (token novo já recusado, ex.: conta desativada): encerra a sessão, sem laço. Teste na Task 3.

---

### Task 1: Tipos, `AuthApi`, `UserApi` e erros 401/403

**Files:**
- Modify: `src/app/core/api/api-types.ts` (apelidos)
- Create: `src/app/core/auth/auth-api.ts`, `src/app/core/auth/auth-api.spec.ts`
- Create: `src/app/core/api/resources/user-api.ts`, `src/app/core/api/resources/user-api.spec.ts`
- Modify: `src/app/core/api/api-error.ts`, `src/app/core/api/api-error.spec.ts`

**Interfaces:**
- Produces: `LoginRequest`, `TokenResponse`, `CreateUserRequest`, `UserResponse`, `UserRole = 'ADMIN' | 'MEMBER'` em `api-types.ts`.
- Produces: `AuthApi` (root) com `login(body: LoginRequest): Observable<TokenResponse>`, `refresh(): Observable<TokenResponse>`, `logout(): Observable<void>` — `POST` em `apiUrl(base, 'auth', 'login'|'refresh'|'logout')`, refresh e logout com corpo `null`.
- Produces: `UserApi` (root) com `create(body: CreateUserRequest): Observable<UserResponse>` → `POST /users`.
- Produces: `parseApiError` passa a devolver o `detail` em português dos erros de autenticação e dono.

- [ ] **Step 1: Testes que falham**
  - `auth-api.spec.ts` (HttpTestingController, padrão dos outros `*-api.spec.ts`): `login` faz `POST …/auth/login` com o corpo; `refresh` e `logout` fazem `POST` sem corpo (`req.body === null`).
  - `user-api.spec.ts`: `create` faz `POST …/users` com o corpo.
  - `api-error.spec.ts`, novos casos:
    - 403 com `detail: 'Só o criador pode alterar este elemento.'` → `message` igual ao detail.
    - 403 com `detail: 'Só o dono de um dos elementos pode alterar esta ligação.'` → igual.
    - 401 com `detail: 'Credenciais inválidas ou sessão expirada.'` → igual.
    - 409 `'E-mail já cadastrado.'`, 409 `'Você não pode desativar a própria conta.'`, 400 `'A senha precisa ter pelo menos 10 caracteres.'`, 404 `'Usuário não encontrado.'`, 403 `'Acesso negado.'` → iguais.
    - 401 sem detail → `'Sua sessão expirou. Entre novamente.'`; 403 sem detail → `'Você não tem permissão para fazer isso.'`.
    - 401 com `detail: 'Autenticação necessária.'` → `'Sua sessão expirou. Entre novamente.'` (a frase do backend é técnica para quem está no meio do uso).

- [ ] **Step 2: Rodar e ver falhar**
  Run: `npx ng test --watch=false --include src/app/core/auth/auth-api.spec.ts --include src/app/core/api/resources/user-api.spec.ts --include src/app/core/api/api-error.spec.ts`
  Expected: FAIL ("Could not resolve ./auth-api", "./user-api"; asserções novas de `api-error`).

- [ ] **Step 3: Implementar**
  Apelidos em `api-types.ts`; `UserRole` = `NonNullable<UserResponse['role']>`. Em `api-error.ts`, uma lista `BACKEND_PT_DETAILS` (as frases do Step 1, exceto "Autenticação necessária.") usada antes de `translateDetail`; `STATUS_MESSAGES` ganha 401 e 403; "Autenticação necessária." mapeia para a frase de sessão expirada.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando. Expected: PASS.

- [ ] **Step 5: Registrar** — `feat: auth and user API clients, Portuguese auth errors`

### Task 2: `AuthSession` e leitura do token

**Files:**
- Create: `src/app/core/auth/jwt.ts`, `src/app/core/auth/jwt.spec.ts`
- Create: `src/app/core/auth/auth-session.ts`, `src/app/core/auth/auth-session.spec.ts`
- Create: `src/app/core/auth/roles.ts` (com spec curto no `jwt.spec.ts` ou próprio)

**Interfaces:**
- Consumes: `AuthApi`, `TokenResponse`, `UserRole`, `parseApiError`, `ApiError` (Task 1).
- Produces: `readTokenClaims(token: string): { userId: string | null; role: UserRole | null }` — decodifica o payload base64url; token malformado → `{ userId: null, role: null }`, nunca lança.
- Produces: `roleText(role: UserRole | null): string` — `'Administrador'` / `'Técnico'` / `''`.
- Produces: `type SessionStatus = 'checking' | 'offline' | 'signedIn' | 'signedOut'`.
- Produces: `AuthSession` (root):
  - sinais `status: Signal<SessionStatus>`, `role: Signal<UserRole | null>`, `userId: Signal<string | null>`, `isAdmin: Signal<boolean>`;
  - `token(): string | null`;
  - `start(): Promise<SessionStatus>` — primeira chamada faz o refresh; chamadas seguintes devolvem a mesma promessa enquanto não termina; depois de `signedIn`/`signedOut` resolve direto; em `offline`, uma nova chamada tenta de novo;
  - `login(email: string, password: string): Observable<void>` — erro já como `ApiError` (`parseApiError`);
  - `refresh(): Observable<string>` — token novo; **compartilhado** enquanto em andamento (`share()` + limpar a referência no `finalize`); 401 → `expire()` e erro; status 0 → erro sem mudar a sessão;
  - `logout(): void` — chama `AuthApi.logout`, e no sucesso **ou** erro limpa e navega para `/entrar`;
  - `expire(): void` — limpa, cancela o timer, navega para `/entrar` com `queryParams: { expirou: 1, voltar: router.url }` (sem `voltar` se a URL atual já é `/entrar…`).
  - Timer: após login/refresh, `setTimeout` em `max(10, expiresIn − 60)` s chama `refresh()`; erro de rede reagenda em 30 s; 401 já encerrou.

- [ ] **Step 1: Testes que falham**
  - `jwt.spec.ts`: token com payload `{"sub":"u1","role":"ADMIN"}` (montado com `btoa` + troca `+/=` para base64url) → `{ userId: 'u1', role: 'ADMIN' }`; `'abc'` → nulos; papel desconhecido → `role: null`. `roleText('MEMBER') === 'Técnico'`, `roleText('ADMIN') === 'Administrador'`, `roleText(null) === ''`.
  - `auth-session.spec.ts` (`AuthApi` falso com `Subject`s, `Router` falso com `navigate: vi.fn()` e `url`, `vi.useFakeTimers()`):
    - `start()` com refresh 200 → `signedIn`, `token()` = o novo, `role()` do token; duas chamadas de `start()` → um só `refresh`.
    - `start()` com refresh 401 → `signedOut`, sem navegar.
    - `start()` com erro de rede → `offline`; nova `start()` chama refresh de novo.
    - `refresh()` duas vezes antes de responder → `AuthApi.refresh` chamado uma vez; os dois recebem o mesmo token. Depois de responder, um novo `refresh()` faz outro pedido.
    - Refresh 401 → `status` `signedOut`, `token()` nulo e `router.navigate(['/entrar'], { queryParams: { expirou: 1, voltar: '/caixas/b1/fusoes' } })` (com `router.url = '/caixas/b1/fusoes'`).
    - Refresh com erro de rede depois de `signedIn` → continua `signedIn` com o token antigo.
    - Timer: login com `expiresIn: 900` → após `840_000` ms chama refresh; com `expiresIn: 30` → após `10_000` ms. Renovação agendada com erro de rede → nova tentativa após `30_000` ms.
    - `logout()` com erro do servidor → ainda limpa e navega para `['/entrar']`; o timer não dispara mais.
    - `login()` 401 → o Observable falha com `ApiError` cuja `message` é `'Credenciais inválidas ou sessão expirada.'`.
    - O token nunca vai para `localStorage`/`sessionStorage` (espiar `Storage.prototype.setItem` e conferir que não foi chamado).

- [ ] **Step 2: Rodar e ver falhar**
  Run: `npx ng test --watch=false --include src/app/core/auth/jwt.spec.ts --include src/app/core/auth/auth-session.spec.ts`
  Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** `jwt.ts`, `roles.ts`, `auth-session.ts` conforme as interfaces. `DestroyRef`/`onDestroy` cancela o timer.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando. Expected: PASS.

- [ ] **Step 5: Registrar** — `feat: in-memory auth session with shared refresh and scheduled renewal`

### Task 3: Interceptor

**Files:**
- Create: `src/app/core/auth/auth.interceptor.ts`, `src/app/core/auth/auth.interceptor.spec.ts`
- Modify: `src/app/app.config.ts` (`withInterceptors([authInterceptor, acceptLanguageInterceptor])`)

**Interfaces:**
- Consumes: `AuthSession.token()`, `AuthSession.refresh()`, `AuthSession.expire()`, `API_BASE_URL`.
- Produces: `authInterceptor: HttpInterceptorFn`; `AUTH_RETRIED = new HttpContextToken(() => false)`.

Regras: só URLs que começam com `API_BASE_URL`. Todas ganham `withCredentials: true`. Fora de `${base}/auth/` ganham `Authorization: Bearer <token>` quando há token. Resposta 401 fora de `/auth/`, sem `AUTH_RETRIED`: `session.refresh()` → repetir com o token novo e `AUTH_RETRIED = true`. Repetição com 401 → `session.expire()` e o erro segue. Erro do refresh → o erro **do refresh** segue para quem chamou: status 0 mostra a frase de conexão (a sessão continua); 401 já chamou `expire()` dentro da sessão.

- [ ] **Step 1: Testes que falham** (`provideHttpClient(withInterceptors([authInterceptor]))` + `provideHttpClientTesting()`, `AuthSession` falso com `token`, `refresh: vi.fn()` e `expire: vi.fn()`, `API_BASE_URL = 'http://api/v1'`):
  - `GET http://api/v1/boxes` leva `Authorization: Bearer t1` e `withCredentials: true`.
  - `POST http://api/v1/auth/refresh` leva `withCredentials: true` e **sem** `Authorization`.
  - `GET https://tile.openstreetmap.org/1/1/1.png` sai sem cabeçalho e sem `withCredentials`.
  - 401 em `/boxes` → `refresh` chamado, nova requisição com `Bearer t2`, quem chamou recebe o corpo da repetição.
  - Três chamadas recebem 401 ao mesmo tempo, com `refresh` devolvendo o mesmo `Subject` compartilhado → as três repetem com `t2`. (O refresh único é da sessão; aqui confere que o interceptor espera em vez de pedir de novo: `refresh` pode ser chamado 3×, mas o `AuthSession` real da Task 2 devolve o mesmo pedido — um teste extra usa o `AuthSession` real com `AuthApi` falso e confere **um** `AuthApi.refresh`.)
  - Repetição volta 401 → `expire` chamado uma vez e o erro chega a quem chamou; nenhuma terceira requisição.
  - Refresh falha com status 0 → quem chamou recebe o erro de status 0 (não o 401); `expire` não chamado.
  - 401 em `/auth/login` passa direto (sem refresh).

- [ ] **Step 2: Rodar e ver falhar**
  Run: `npx ng test --watch=false --include src/app/core/auth/auth.interceptor.spec.ts`
  Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** e registrar no `app.config.ts`.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando + `npx ng build`. Expected: PASS; build ok.

- [ ] **Step 5: Registrar** — `feat: auth interceptor with bearer token and single retry after refresh`

### Task 4: Guardas, rotas e página `/entrar`

**Files:**
- Create: `src/app/core/auth/auth-guards.ts`, `src/app/core/auth/auth-guards.spec.ts`
- Create: `src/app/features/auth/sign-in-page.ts|html|scss|spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `AuthSession.start()`, `status`, `login()` (Task 2); `ApiError`.
- Produces: `safeReturnUrl(value: string | null | undefined): string`; `authGuard: CanActivateFn`; `guestGuard: CanActivateFn`.
  - `authGuard`: `await start()`; `signedIn` → `true`; senão `UrlTree` para `/entrar?voltar=<state.url>`.
  - `guestGuard`: `await start()`; `signedIn` → `UrlTree` para `/`; senão `true`.
- Rotas: `entrar` (título "GeoFiber — Entrar", `canActivate: [guestGuard]`, `loadComponent` da página); `canActivate: [authGuard]` em `''`, `modelos`, `caixas/:boxId/fusoes`, `importar`.

Página: lê `voltar` e `expirou` da query.
- `status() === 'offline'`: só a frase "Não foi possível conectar ao servidor do GeoFiber." e o botão **Tentar novamente** (`data-action="tentar-de-novo"`) → `start()`; se virar `signedIn`, navega para `safeReturnUrl(voltar)`.
- Senão: título "GeoFiber", subtítulo "Entre para ver e documentar a rede.", aviso `[role="status"]` "Sua sessão expirou. Entre novamente." quando `expirou`, campos `email` e `password` (botão de mostrar/ocultar `data-action="mostrar-senha"`), botão **Entrar** (`type="submit"`, desabilitado enquanto envia). Validação local: e-mail obrigatório e válido → "Informe um e-mail válido."; senha obrigatória → "Informe a senha.". Erro 401/rede → `[role="alert"]` com `ApiError.message`; erro 400 → mensagem no campo pelo `field` (`email`/`password`, com os textos acima). Sucesso → `router.navigateByUrl(safeReturnUrl(voltar))`.

- [ ] **Step 1: Testes que falham**
  - `auth-guards.spec.ts`: `safeReturnUrl('/caixas/b1/fusoes') === '/caixas/b1/fusoes'`; `'//site.com'`, `'https://site.com'`, `'javascript:alert(1)'`, `''`, `null` → `'/'`. `authGuard` com sessão `signedOut` → UrlTree serializada `'/entrar?voltar=%2Fimportar'` (state.url `/importar`); com `offline` → o mesmo; `signedIn` → `true`. `guestGuard` com `signedIn` → `'/'`.
  - `sign-in-page.spec.ts` (`timeout: 20000`; `AuthSession` falso com `status` signal, `login: vi.fn()`, `start: vi.fn()`; `Router` real ou falso com `navigateByUrl`):
    - Com `expirou=1`, mostra "Sua sessão expirou. Entre novamente.".
    - Enviar vazio → "Informe um e-mail válido." e "Informe a senha.", `login` não chamado.
    - `login` com `of(undefined)` e `voltar=/caixas/b1/fusoes` → `navigateByUrl('/caixas/b1/fusoes')`; com `voltar=//site.com` → `navigateByUrl('/')`.
    - `login` com erro `{ status: 401, message: 'Credenciais inválidas ou sessão expirada.' }` → `[role="alert"]` com o texto e os campos mantêm o que foi digitado.
    - Erro 400 com `fieldErrors: { email: 'must be a well-formed email address' }` → no campo e-mail aparece "Informe um e-mail válido." (não o texto em inglês).
    - `status` `offline` → mostra a frase de conexão; "Tentar novamente" chama `start`.

- [ ] **Step 2: Rodar e ver falhar**
  Run: `npx ng test --watch=false --include src/app/core/auth/auth-guards.spec.ts --include src/app/features/auth/sign-in-page.spec.ts`
  Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** guardas, página (Reactive Forms + Material form-field, tokens `--gf-*`, cartão centralizado de até 400px, funciona em 360px) e rotas.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando + `npx ng build`. Expected: PASS; build ok.

- [ ] **Step 5: Registrar** — `feat: sign-in page and route guards`

### Task 5: Menu de conta e cadastro de usuário

**Files:**
- Create: `src/app/shared/users/user-form-dialog.ts|html|scss|spec.ts`
- Modify: `src/app/shared/map/map-toolbar.ts|html|scss` + Create `map-toolbar.spec.ts` (se não existir)
- Modify: `src/app/features/network-map/network-map-page.ts|html`

**Interfaces:**
- Consumes: `AuthSession.role`, `isAdmin`, `logout()` (Task 2); `roleText` (Task 2); `UserApi.create` (Task 1); `showSaveError`/`applyFieldErrors`, `NotificationService`.
- Produces: `MapToolbarComponent` ganha `roleLabel = input('')`, `isAdmin = input(false)`, `createUser = output<void>()`, `signOut = output<void>()`. O botão `data-action="conta"` (ícone `account_circle`, `aria-label="Conta"`) fica no pé da coluna e abre um `mat-menu` com: linha de texto do papel (não clicável), **Cadastrar usuário** (`data-action="cadastrar-usuario"`, só com `isAdmin`) e **Sair** (`data-action="sair"`).
- Produces: `UserFormDialogComponent` (diálogo do padrão do projeto; fecha com `UserResponse`). Campos `name` (obrigatório), `email` (obrigatório, e-mail), `password` (obrigatório, `minLength(10)`, mostrar/ocultar), `role` (`MEMBER` padrão; opções "Técnico" e "Administrador" em `mat-radio-group` ou `<select>` nativo). Erros locais: "Informe o nome.", "Informe um e-mail válido.", "A senha precisa ter pelo menos 10 caracteres.". Salvar: `disableClose` enquanto salva; sucesso → `notifications.success('Usuário <nome> cadastrado.')` e `close(user)`. Erro: `showSaveError`; além disso 409 → erro `api` "E-mail já cadastrado." no campo `email`; 400 sem `fieldErrors` → erro `api` com a mensagem no campo `password`. O diálogo continua aberto com o que foi digitado.
- Página do mapa: `[roleLabel]="roleText(session.role())"`, `[isAdmin]="session.isAdmin()"`, `(createUser)` abre o diálogo (`width: '440px'`, `maxWidth: '92vw'`), `(signOut)="session.logout()"`.

- [ ] **Step 1: Testes que falham**
  - `map-toolbar.spec.ts` (`timeout: 20000`): abrir `[data-action="conta"]` mostra "Técnico" e `[data-action="sair"]`, sem `[data-action="cadastrar-usuario"]`; com `isAdmin` e `roleLabel` "Administrador" aparece "Cadastrar usuário"; clicar emite `createUser`/`signOut`.
  - `user-form-dialog.spec.ts` (`timeout: 20000`; `UserApi` falso, `MatDialogRef` falso, `NotificationService` falso com `apiError` → `parseApiError`):
    - Enviar com senha `'curta'` → "A senha precisa ter pelo menos 10 caracteres.", `create` não chamado.
    - Válido → `create({ name: 'Ana', email: 'ana@x.com', password: 'senha-com-dez', role: 'MEMBER' })`, sucesso "Usuário Ana cadastrado." e `close` com a resposta.
    - 409 `'E-mail já cadastrado.'` → erro no campo e-mail, diálogo aberto, campos mantidos.
    - 400 `'A senha precisa ter pelo menos 10 caracteres.'` sem `errors` → erro no campo senha.
    - Nenhum texto `ADMIN`/`MEMBER` no DOM.

- [ ] **Step 2: Rodar e ver falhar**
  Run: `npx ng test --watch=false --include src/app/shared/map/map-toolbar.spec.ts --include src/app/shared/users/user-form-dialog.spec.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar** toolbar, diálogo e a ligação na página do mapa (sem spec: Leaflet não roda no jsdom).

- [ ] **Step 4: Rodar e ver passar** — mesmo comando + `npx ng build`. Expected: PASS; build ok.

- [ ] **Step 5: Registrar** — `feat: account menu with sign-out and admin user registration`

### Task 6: 403 de dono preserva o formulário, docs e suíte

**Files:**
- Modify: `src/app/shared/network/box-form-dialog.spec.ts` (caso novo)
- Modify: `docs/SPECS.md`, `docs/GUIA.md`, `README.md`, `CLAUDE.md`, status no design e no plano

- [ ] **Step 1: Teste** em `box-form-dialog.spec.ts`: salvar recebe 403 `'Só o criador pode alterar este elemento.'` → `apiError` chamado (aviso com o texto), diálogo não fecha, nome digitado continua. Run com `--include src/app/shared/network/box-form-dialog.spec.ts`. Expected: PASS já com a Task 1 (o padrão pessimista existe); se falhar, corrigir o diálogo.
- [ ] **Step 2: Docs.** SPECS: módulo `core/auth` (§2) e RI-38 "Sessão e acesso" (memória, refresh único, `voltar` seguro, 401/403, papéis em texto, dono decidido pelo backend). GUIA: "Entrar e sair", "Sessão expirada", "Cadastrar usuário (administrador)", "Quando aparece 'Só o criador pode alterar'". README: `core/auth`, `features/auth`, CORS/cookie (origem `http://localhost:4200`, HTTPS ou localhost). CLAUDE: tabela "Onde está cada coisa", padrão "chamadas autenticadas pelo interceptor", situação (etapa 1 feita, etapa 2 depende de `GET /users` e `GET /auth/me`), troca do texto "Autenticação virá depois".
- [ ] **Step 3: Suíte e build.** Run: `npx ng test --watch=false` e `npx ng build`. Expected: todos passando, sem "Unhandled"; build ok.
- [ ] **Step 4: Registrar** — `docs: authentication stage 1`
