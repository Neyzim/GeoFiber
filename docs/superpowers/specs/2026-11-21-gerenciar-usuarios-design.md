# Gerenciar usuários — design (segurança, etapa 2)

Data: 2026-11-21 · Situação: **implementado** (2026-11-21, plano `2026-11-21-gerenciar-usuarios.md`). Continua
`2026-11-21-seguranca-frontend-design.md` (etapa 1).

## Intenção

Só uma pessoa administra as contas: o dono do projeto. Os casos reais são **desligar o técnico que
saiu** e **trocar a senha de quem esqueceu** (o técnico liga, o admin define uma senha temporária e
passa para ele). Hoje o admin só consegue cadastrar; não vê quem existe.

## Objetivos

1. Página `/usuarios` (só ADMIN) com a lista de usuários: nome, e-mail, papel, situação.
2. Desativar / reativar por linha, com confirmação.
3. Trocar senha por linha, num diálogo.
4. Cadastrar usuário a partir da página; a lista recarrega depois.

## Fora do escopo / anti-objetivos

- Mudar papel, excluir conta, "esqueci a senha" por e-mail, obrigar troca no próximo login (o backend
  não tem; com um admin só não faz falta).
- `GET /auth/me` / nome no cabeçalho: não é necessário para esta tela.
- **Falha:** o admin conseguir se trancar para fora; código do backend (`ADMIN`, `MEMBER`) na tela;
  técnico chegando na página.

## Backend (já publicado)

`GET /users` (ordenado por nome, `UserResponse` = id, name, email, role, active), `POST /users`,
`PATCH /users/{id}/active` (`{active}`; desativar encerra as sessões; 409 "Você não pode desativar a
própria conta."), `PUT /users/{id}/password` (`{password}`, mín. 10; encerra as sessões; 204).
Controller inteiro exige ADMIN. `npm run api:types` já rodado (2026-11-21): o `schema.d.ts` tem o `GET`.

## Abordagens

- **A. Página `/usuarios` — escolhida pelo dono.** Link próprio, "Voltar" como as outras páginas,
  diálogos (senha, cadastro) abrem sobre a página sem empilhar.
- B. Diálogo grande aberto pelo menu: menos código, mas "Trocar senha" viraria diálogo sobre diálogo e
  a lista não teria link. Descartada.

## Como funciona

```
← Voltar        Usuários                    [+ Cadastrar]
Maria Silva    maria@…   Técnico         Ativa       [Trocar senha] [Desativar]
João Souza     joao@…    Técnico         Desativada                 [Reativar]
Você           voce@…    Administrador   Ativa       [Trocar senha]
```

- Rota `/usuarios` com `authGuard` + guarda de admin (papel ≠ ADMIN → `/`). O papel do JWT só decide
  a tela; o backend protege de verdade (403 vira aviso).
- Entrada: item **"Usuários"** no painel lateral do mapa, abaixo de "Importar KMZ/KML" e no mesmo formato (só ADMIN; pedido do dono em 2026-11-21). O menu de conta fica só com o papel e "Sair".
- Store da página: carrega `GET /users`; escritas pessimistas, recarregam a lista após sucesso.
- Erro ao carregar: mensagem + "Tentar novamente". Lista vazia não acontece (o admin existe).
- **Desativar:** confirmação "Desativar Maria Silva? Ela sai do sistema em até 15 minutos e não
  consegue entrar de novo até ser reativada." Reativar não pede confirmação.
- **Trocar senha:** diálogo com Nova senha (mín. 10, mostrar/ocultar), padrão dos formulários (salva
  sozinho, não fecha enquanto salva). Sucesso: "Senha de Maria Silva trocada. Passe a nova senha para
  ela." 400 no campo.
- **Cadastrar:** reaproveita `user-form-dialog`; ao fechar com resultado, recarrega a lista.
- Textos: `ADMIN` → "Administrador", `MEMBER` → "Técnico"; ativo → "Ativa"/"Desativada" como situação
  (cinza `inactive` para desativada).

## Calls do construtor (decididas por mim, revisar se incomodar)

- A própria linha mostra "(você)" ao lado do nome (pelo `sub` do JWT) e **não** tem "Desativar" — o
  backend já recusa, o botão escondido só evita o erro.
- No celular a tabela vira lista de cartões (nome, e-mail, papel·situação, botões embaixo).
- Botões por linha com texto, não só ícone (público leigo).

## Restrições

TDD; docs: SPECS (RI nova, módulo), GUIA ("Gerenciar usuários"), README, CLAUDE; tipos do backend
via `api-types.ts`.
