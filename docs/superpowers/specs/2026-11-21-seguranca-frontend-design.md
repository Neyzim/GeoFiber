# Segurança no frontend — design (etapa 1 de 2)

Data: 2026-11-21 · Situação: **etapa 1 implementada** (2026-11-21, plano `2026-11-21-seguranca-frontend.md`).
Fonte: "Segurança — especificação para o frontend" do backend (contratos em `geofiber-backend/API.md`,
regras RT-14 e RT-15 no `docs/SPECS.md` do backend).

## Intenção

O backend passou a exigir login, separa os papéis ADMIN (gerencia usuários) e MEMBER (opera a rede) e
só deixa o criador alterar ou apagar caixa, cabo, OLT e cliente. O front precisa entrar, manter a
sessão sem pedir a senha a toda hora, sair, e explicar com clareza quando o backend recusa algo.

## Etapas

- **Etapa 1 (este documento):** login, sessão, renovação, logout, guarda das rotas, tratamento de
  401/403, cadastro de usuário pelo ADMIN.
- **Etapa 2 (depois que o dono publicar `GET /users` e `GET /auth/me`):** lista de usuários,
  ativar/desativar, redefinir senha, nome de quem entrou no cabeçalho. Sem esses endpoints, essas
  telas exigiriam digitar ids à mão — contornar o backend, o que a regra do projeto proíbe.

## Objetivos

1. Página `/entrar` com e-mail e senha.
2. Token de acesso só em memória; nunca `localStorage`/`sessionStorage`. O refresh só existe no cookie.
3. Ao abrir ou recarregar, o front tenta `POST /auth/refresh` e entra sem pedir senha se der certo.
4. Renovação antes do fim (`expiresIn − 60 s`) e, num 401, **um único refresh em andamento**
   compartilhado por todas as chamadas, repetindo cada chamada uma vez.
5. Sair (`POST /auth/logout`) a qualquer momento.
6. 403 de dono vira aviso claro, sem perder o que a pessoa digitou.
7. ADMIN cadastra usuário (nome, e-mail, senha ≥ 10, papel).

## Fora do escopo / anti-objetivos

- Não esconder editar/excluir por dono: as respostas não trazem o criador (pendência do backend).
  `canEdit` continua `true` para quem entrou. Botão escondido nunca é a proteção.
- Não decidir acesso pelo token no cliente: papel lido do JWT só mostra ou esconde partes da tela.
- Não guardar rascunhos para sobreviver a um recarregamento (a especificação aceita a perda).
- Não contornar os 15 min de validade do token após desativação.
- **Falha:** dois refreshes simultâneos (o backend encerra todas as sessões do usuário); sessão
  derrubada por erro de rede; token em armazenamento do navegador; código do backend (`ADMIN`,
  `MEMBER`) aparecendo na tela.

## Abordagens consideradas

- **Serviço de sessão + interceptor + guarda, sem biblioteca (escolhida).** Controle exato do refresh
  único e da repetição, testável com `HttpTestingController`.
- Biblioteca pronta (`angular-oauth2-oidc`, `@auth0/angular-jwt`): feitas para OIDC ou para token no
  navegador; não cobrem refresh por cookie com rotação; dependência a mais. Descartada.
- Refresh inicial no `provideAppInitializer`: tela em branco até responder e sem lugar bom para o erro
  de rede. Descartado; a guarda espera o refresh.
- Login como diálogo sobre a tela (guarda o formulário aberto): mais trabalho e chamadas presas
  enquanto o diálogo está aberto. **O dono escolheu a página `/entrar`.** Sessão cair no meio do uso
  só acontece com conta desativada, senha trocada pelo admin ou 14 dias sem uso.

## Como funciona

### Sessão (`core/auth/auth-session.ts`)

Serviço raiz com sinais: `status` (`checking` | `signedIn` | `signedOut`), `role` (`ADMIN` |
`MEMBER` | null), `userId`, e o token (privado). Lê `sub` e `role` do payload do JWT (base64url),
só para a interface.

- `start()`: chamado pela guarda na primeira navegação; uma única vez (reaproveita a mesma promessa).
  200 → `signedIn`; 401 → `signedOut`; erro de rede → fica `checking` e a guarda mostra o aviso de
  conexão com "Tentar novamente".
- `login(email, password)`: 200 guarda o token; 401 e 400 voltam o erro já traduzido para a página.
- `refresh()`: **único em andamento** — se já existe, devolve o mesmo (Observable compartilhado).
  200 troca o token e reagenda; 401 encerra a sessão; erro de rede não encerra.
- Renovação agendada em `expiresIn − 60` s (mínimo 10 s). Se a renovação agendada falhar por rede,
  tenta de novo em 30 s; 401 encerra.
- `logout()`: chama o endpoint e, **com sucesso ou erro**, limpa a memória e vai para `/entrar`.
- `expire()`: limpa, cancela o timer e navega para `/entrar?expirou=1&voltar=<url atual>`.

### Cliente HTTP (`core/auth/auth.interceptor.ts`)

Interceptor funcional, antes do de idioma. Só age em URLs que começam com `API_BASE_URL`:

- Todas recebem `withCredentials: true` (o cookie precisa ir e vir).
- Fora de `/auth/*`: põe `Authorization: Bearer <token>` quando há token.
- Resposta 401 fora de `/auth/*`: espera `refresh()`; deu certo → repete a chamada **uma vez** com o
  token novo (marcada para não repetir de novo); falhou com 401 → `expire()` e o erro segue para quem
  chamou. Uma segunda 401 na repetição também vira `expire()`.

### Guardas e rotas

- `authGuard` em todas as rotas atuais (mapa, modelos, fusões, importar): espera `start()`;
  `signedOut` → `/entrar?voltar=<url>`. Link direto (`/caixas/…/fusoes`) volta ao endereço depois
  de entrar.
- `/entrar` (`features/auth/sign-in-page`) com `guestGuard`: quem já entrou vai para `/`.
- `voltar` só aceita caminho interno começando com `/` (e não `//`), para não virar redirecionamento
  aberto.
- Sem conexão no início: a página mostra "Não foi possível conectar ao servidor do GeoFiber." e
  "Tentar novamente" (componente simples no lugar da rota, dentro da guarda/estado).

### Página de login

Título GeoFiber, campos E-mail e Senha (mostrar/ocultar), botão **Entrar** (desabilitado enquanto
envia). Mensagens:

- `?expirou=1`: "Sua sessão expirou. Entre novamente." acima do formulário.
- 401: o `detail` do backend ("Credenciais inválidas ou sessão expirada."), sem dizer se o e-mail existe.
- 400: erro em cada campo; mensagens do Bean Validation trocadas por textos próprios pelo `field`
  ("Informe um e-mail válido.", "Informe a senha.").
- Erro de rede: a frase de conexão já usada em `api-error.ts`.

### Erros 401/403 na interface (`api-error.ts`)

- Os `detail` de autenticação e dono já vêm em português do backend: a tradução passa a usá-los
  quando não houver tradução própria e o status for 401, 403 ou 409/400 das telas de usuário.
- Mensagens por status como reserva: 401 "Sua sessão expirou. Entre novamente.", 403 "Você não tem
  permissão para fazer isso."
- 403 de dono ("Só o criador pode alterar este elemento.", "Só o dono de um dos elementos pode
  alterar esta ligação."): aviso pelo `NotificationService` como os outros erros; diálogos continuam
  abertos com o que foi digitado (padrão pessimista atual); arrastos fazem o rollback que já existe.
  O plano confere isso com teste em pelo menos um formulário e na lista do cabo.

### Conta e saída

Botão de conta no pé da barra de ferramentas do mapa (ícone `account_circle`, mesma coluna de 40px).
Abre um menu curto: papel em texto ("Administrador" ou "Técnico"), **Cadastrar usuário** (só ADMIN)
e **Sair**. As outras telas (fusões, importar, modelos) já têm "Voltar"; a saída fica no mapa.

### Cadastro de usuário (ADMIN)

Diálogo de formulário no padrão do projeto (salva sozinho, não fecha enquanto salva): Nome, E-mail,
Senha (mín. 10, com mostrar/ocultar), Papel ("Técnico" = MEMBER, "Administrador" = ADMIN; padrão
Técnico). Sucesso: aviso "Usuário <nome> cadastrado." Erros: 409 no campo e-mail ("E-mail já
cadastrado."), 400 de senha curta no campo senha, 403 aviso. Sem lista depois (etapa 2).

### Textos e papéis

Nenhum código do backend na tela: `ADMIN` → "Administrador", `MEMBER` → "Técnico".

## Restrições

- Tipos seguem o backend: `npm run api:types` com o backend rodando gera `LoginRequest`,
  `TokenResponse`, `UserCreateRequest`, `UserResponse`; apelidos em `api-types.ts`. Se algum faltar
  no OpenAPI, avisar o dono.
- Origem do front em `CORS_ALLOWED_ORIGINS` (padrão `http://localhost:4200`); cookie `Secure` só em
  HTTPS ou `localhost`.
- TDD; specs do interceptor e da sessão cobrem: refresh único com várias 401 simultâneas, repetir uma
  vez só, refresh 401 → login com "expirou", erro de rede no refresh não encerra, logout com erro
  ainda limpa, `voltar` externo ignorado.
- Docs: SPECS (novo módulo `core/auth`, RI nova), GUIA (entrar, sair, sessão expirada, cadastrar
  usuário), README, CLAUDE.

## Deixado ao construtor

Nomes internos, a forma exata do aviso de conexão, ícones, a ordem dos itens do menu de conta.

## Pendências do backend (para o dono)

`GET /users` e `GET /auth/me` (etapa 2); `createdBy` ou `ownedByMe` nas respostas para esconder
editar/excluir de quem não é dono; 429 no login no futuro (o front mostraria o `detail`).
