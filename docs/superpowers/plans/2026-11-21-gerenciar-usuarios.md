# Gerenciar usuários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/usuarios` (só administrador) para listar usuários, desativar/reativar, trocar senha e cadastrar.

**Architecture:** `UserApi` ganha `list`, `setActive`, `resetPassword`; um `UsersStore` (provido pela página) carrega e recarrega a lista; `adminGuard` protege a rota; diálogo novo de troca de senha no padrão de `user-form-dialog`; o menu de conta do mapa troca "Cadastrar usuário" por "Gerenciar usuários" (navega para a página).

**Tech Stack:** Angular 22 (standalone, signals, zoneless, OnPush), Angular Material, Vitest via `ng test`.

**Spec:** `docs/superpowers/specs/2026-11-21-gerenciar-usuarios-design.md`

**Situação:** executado em 2026-11-21 (Tasks 1–5, sem commits — o dono commita).

## Global Constraints

- Sem Git para o agente: os passos "Registrar" só anotam a mensagem de commit; o dono commita.
- TDD: teste, ver falhar, implementar, ver passar. No fim, suíte inteira (`npx ng test --watch=false`) e `npx ng build`; procurar "Unhandled" na saída.
- Nenhum código do backend na tela: `ADMIN` → "Administrador", `MEMBER` → "Técnico" (use `roleText`); ativo → "Ativa", inativo → "Desativada".
- Escritas pessimistas: a lista só muda depois do sucesso, recarregando `GET /users`.
- Diálogos de formulário salvam sozinhos, `disableClose` enquanto salvam, fecham com o resultado.
- Mocks de `NotificationService.apiError` retornam `parseApiError(error)`. Specs com Material: `describe(..., { timeout: 20000 }, ...)`.
- Senha mínima: `MIN_PASSWORD` (10) de `shared/users/user-form-dialog.ts`.

## Review Focus

- Administrador na própria linha: sem "Desativar" (teste no Task 4); se o backend mesmo assim responder 409, o aviso aparece e a lista não muda (teste no Task 2).
- Técnico abrindo `/usuarios` pelo link: vai para `/` (teste no Task 1).
- Usuário sem sessão abrindo `/usuarios`: vai para `/entrar?voltar=%2Fusuarios`, não para `/` (ordem `[authGuard, adminGuard]`; teste no Task 1).
- Clique duplo em "Desativar"/"Reativar" enquanto a chamada anda: uma chamada só (store guarda `busyId`; teste no Task 2).
- Falha ao carregar a lista: mensagem e "Tentar novamente", sem lista velha nem vazia enganosa (teste no Task 4).

---

### Task 1: API de usuários e guarda de administrador

**Files:**
- Modify: `src/app/core/api/api-types.ts` (perto da linha 79)
- Modify: `src/app/core/api/resources/user-api.ts`, `user-api.spec.ts`
- Modify: `src/app/core/auth/auth-guards.ts`, `auth-guards.spec.ts`

**Interfaces:**
- Produces: `SetActiveRequest`, `ResetPasswordRequest` (apelidos de `Schemas[...]`); `UserApi.list(): Observable<UserResponse[]>` (`GET /users`), `UserApi.setActive(id: string, active: boolean): Observable<UserResponse>` (`PATCH /users/{id}/active`, corpo `{ active }`), `UserApi.resetPassword(id: string, password: string): Observable<void>` (`PUT /users/{id}/password`, corpo `{ password }`); `adminGuard: CanActivateFn` em `auth-guards.ts`.

- [ ] **Step 1: Testes que falham.** Em `user-api.spec.ts`, acrescente ao `describeEndpoints`: `list` → GET `/users`; `setActive('u1', false)` → PATCH `/users/u1/active` com `{ active: false }`; `resetPassword('u1', 'senha-nova-123')` → PUT `/users/u1/password` com `{ password: 'senha-nova-123' }`. Em `auth-guards.spec.ts`, `describe('adminGuard')` com um `run` que aceita `{ status, isAdmin }` (mock `{ start, isAdmin: () => boolean }`):
  - `signedIn` + admin → `true`;
  - `signedIn` + técnico → `'/'`;
  - `signedOut` → `'/'` (o `authGuard`, que vem antes na rota, já cuida do login).
- [ ] **Step 2:** `npx ng test --watch=false --include src/app/core/api/resources/user-api.spec.ts --include src/app/core/auth/auth-guards.spec.ts`. Deve FALHAR (métodos e guarda não existem).
- [ ] **Step 3: Implementar.** Os apelidos, os três métodos (use `apiUrl(this.base, 'users', id, 'active')` ou a forma de path que `apiUrl` aceitar), e `adminGuard`: `await session.start()`; devolve `true` se `signedIn` e `session.isAdmin()`, senão `router.createUrlTree(['/'])`.
- [ ] **Step 4:** O mesmo comando do Step 2. Deve PASSAR.
- [ ] **Step 5: Registrar.** `feat: list users, toggle active and reset password API; admin guard`

### Task 2: `UsersStore`

**Files:**
- Create: `src/app/features/users/users-store.ts`, `users-store.spec.ts`

**Interfaces:**
- Consumes: `UserApi.list`, `UserApi.setActive` (Task 1); `NotificationService.success`/`apiError`.
- Produces: `@Injectable() class UsersStore` (sem `providedIn`; a página provê) com sinais `users: Signal<readonly UserResponse[]>`, `loading: Signal<boolean>`, `loadError: Signal<string | null>`, `busyId: Signal<string | null>`; `load(): void`; `setActive(user: UserResponse, active: boolean): void`.

- [ ] **Step 1: Testes que falham** (`UserApi` e `NotificationService` como mocks):
  - `load` → `loading` fica `true` durante; sucesso preenche `users` na ordem recebida e zera `loadError`;
  - `load` com erro → `users` vazio, `loadError` = `parseApiError(error).message`;
  - `setActive(maria, false)` com sucesso → `success('Conta de Maria Silva desativada.')` e chama `list` de novo; `setActive(joao, true)` → `success('Conta de João Souza reativada.')`;
  - `setActive` com erro 409 → `apiError` chamado, `users` igual ao de antes, `busyId` volta a `null`, `list` não é chamado de novo;
  - segunda chamada a `setActive` enquanto `busyId` não é `null` → ignorada (`setActive` da API chamado uma vez).
- [ ] **Step 2:** `npx ng test --watch=false --include src/app/features/users/users-store.spec.ts`. Deve FALHAR.
- [ ] **Step 3: Implementar** `users-store.ts` conforme Interfaces. O aviso de sucesso usa `Conta de ${user.name} desativada.` / `Conta de ${user.name} reativada.`.
- [ ] **Step 4:** O mesmo comando. Deve PASSAR.
- [ ] **Step 5: Registrar.** `feat: users store with reload after toggling active`

### Task 3: Diálogo "Trocar senha"

**Files:**
- Create: `src/app/shared/users/password-dialog.ts`, `.html`, `.scss`, `.spec.ts`

**Interfaces:**
- Consumes: `UserApi.resetPassword` (Task 1); `MIN_PASSWORD`.
- Produces: `PasswordDialogComponent`, dados `PasswordDialogData { user: UserResponse }`; fecha com `true` depois de salvar, sem valor ao cancelar.

Visual e comportamento copiados de `user-form-dialog` (campo com mostrar/ocultar, dica "Pelo menos 10 caracteres.", erro `api`, botão "Salvando...").

- [ ] **Step 1: Testes que falham** (`describe(..., { timeout: 20000 })`):
  - título "Trocar senha de Maria Silva";
  - senha com 9 caracteres → não chama a API; o campo mostra "A senha precisa ter pelo menos 10 caracteres.";
  - senha válida → `resetPassword('u1', valor)`; durante, `disableClose === true` e botão "Salvando..."; sucesso → `success('Senha de Maria Silva trocada. Passe a nova senha para ela.')` e `close(true)`;
  - erro 400 → o `detail` aparece no campo, o diálogo continua aberto e `disableClose` volta a `false`.
- [ ] **Step 2:** `npx ng test --watch=false --include src/app/shared/users/password-dialog.spec.ts`. Deve FALHAR.
- [ ] **Step 3: Implementar** o diálogo. Botões "Cancelar" e "Trocar senha"; `autocomplete="new-password"`.
- [ ] **Step 4:** O mesmo comando. Deve PASSAR.
- [ ] **Step 5: Registrar.** `feat: reset password dialog`

### Task 4: Página `/usuarios`, rota e menu de conta

**Files:**
- Create: `src/app/features/users/users-page.ts`, `.html`, `.scss`, `.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/shared/map/map-toolbar.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/network-map/network-map-page.ts` (`openUserForm`, ~linha 810), `.html` (linha 63)

**Interfaces:**
- Consumes: `UsersStore` (Task 2), `PasswordDialogComponent` (Task 3), `UserFormDialogComponent`, `ConfirmDialogComponent` (`shared/ui/confirm-dialog`), `AuthSession.userId()`, `roleText`, `adminGuard`.
- Produces: rota `usuarios`, `canActivate: [authGuard, adminGuard]`, título `GeoFiber — Usuários`; saída do toolbar `manageUsers` (troca `createUser`), item `data-action="gerenciar-usuarios"`, ícone `manage_accounts`, texto "Gerenciar usuários".

Layout da página (cabeçalho como `network-models-page`: `mat-icon-button routerLink="/"` "Voltar ao mapa", título "Usuários", botão "+ Cadastrar" à direita). Cada usuário é um item de lista `data-user-id`: nome (com " (você)" quando `id === session.userId()`), e-mail, `roleText(role)` · situação ("Ativa"/"Desativada", desativada com a cor `--gf-*` de `inactive`), botões com texto "Trocar senha" (`data-action="trocar-senha"`) e "Desativar"/"Reativar" (`data-action="desativar"`/`"reativar"`). Acima de 720px, linhas em grade; abaixo, cartões empilhados com botões embaixo. Botões da linha em `busyId` ficam desabilitados.

- [ ] **Step 1: Testes que falham** (store e diálogos como mocks; `describe(..., { timeout: 20000 })`):
  - ao abrir chama `store.load()`; com `loading` mostra "Carregando usuários...";
  - `loadError` → mostra a mensagem e "Tentar novamente" (`data-action="tentar-novamente"`), que chama `load` de novo; nenhuma linha aparece;
  - linhas: "Maria Silva", "maria@x.com", "Técnico · Ativa"; nenhum `ADMIN`/`MEMBER` no texto da página;
  - linha do próprio admin: " (você)" e sem `[data-action="desativar"]`;
  - "Desativar" abre o `ConfirmDialog` com título "Desativar Maria Silva?", mensagem "Ela sai do sistema em até 15 minutos e não consegue entrar de novo até ser reativada.", `confirmLabel: 'Desativar'`, `danger: true`; confirmado → `store.setActive(maria, false)`; cancelado → não chama;
  - "Reativar" chama `store.setActive(joao, true)` sem confirmação;
  - "Trocar senha" abre `PasswordDialogComponent` com `{ user: maria }`;
  - "+ Cadastrar" abre `UserFormDialogComponent`; fechado com usuário → `store.load()`; fechado sem valor → não recarrega.
  - Em `map-toolbar.spec.ts`, troque `cadastrar-usuario`/`createUser` por `gerenciar-usuarios`/`manageUsers` e o texto "Gerenciar usuários".
- [ ] **Step 2:** `npx ng test --watch=false --include src/app/features/users/users-page.spec.ts --include src/app/shared/map/map-toolbar.spec.ts`. Deve FALHAR.
- [ ] **Step 3: Implementar** a página (provê `UsersStore`), a rota em `app.routes.ts` (antes do `**`), a troca no toolbar e, no mapa, `(manageUsers)="openUsers()"` com `router.navigateByUrl('/usuarios')`. Remova `openUserForm` e o import de `UserFormDialogComponent` do mapa.
- [ ] **Step 4:** O mesmo comando. Deve PASSAR.
- [ ] **Step 5: Registrar.** `feat: users page with deactivate, reactivate and reset password`

### Task 5: Documentação e suíte

**Files:**
- Modify: `docs/SPECS.md` (módulo `features/users`; RI nova "RI-39 Gerenciar usuários": só ADMIN, própria conta sem desativar, confirmação, recarga após sucesso, textos em português), `docs/GUIA.md` (seção "Gerenciar usuários": técnico que saiu → Desativar; esqueceu a senha → Trocar senha e passar a senha temporária; o técnico sai em até 15 min), `README.md`, `CLAUDE.md` (tabela "Onde está cada coisa": `features/users/`; Situação: segurança etapa 2 ✅ não commitada; contagem de testes), o design (Situação → implementado) e este plano (Situação → executado).

- [ ] **Step 1:** Atualize os documentos.
- [ ] **Step 2:** `npx ng test --watch=false`. Todos os testes devem passar, sem "Unhandled".
- [ ] **Step 3:** `npx ng build`. O build deve passar.
- [ ] **Step 4: Registrar.** `docs: user management (security stage 2)`
