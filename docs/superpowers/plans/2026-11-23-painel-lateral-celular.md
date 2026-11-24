# Painel lateral no celular: só o ☰ — plano

**Spec:** `docs/superpowers/specs/2026-11-23-painel-lateral-celular-design.md`

- [x] Testes em `network-sidebar.spec.ts`: o botão `Expandir painel` tem `.sidebar__toggle` e o ícone
  `menu` (`.sidebar__toggle-mobile`); depois de expandir, clicar em `.sidebar__backdrop` recolhe. Os dois falharam antes.
- [x] `network-sidebar.html`: ícones `chevron_right` e `menu` no botão; fundo `sidebar__backdrop` fora do
  `<aside>`, só quando o painel está aberto.
- [x] `network-sidebar.scss` (< 900px): o host fica absoluto; recolhido, 40×40 no canto; a coluna esconde
  tudo menos o ☰; aberto, por cima do mapa, com o fundo fixo.
- [x] `network-map-page.scss`: `.project` com `position: relative`; abaixo de 900px, `.project__overlay--left` em `top: 60px`.
- [x] Docs: SPECS RI-43, GUIA "Painel lateral", CLAUDE.md.
- [x] Suíte inteira e `npx ng build`.
