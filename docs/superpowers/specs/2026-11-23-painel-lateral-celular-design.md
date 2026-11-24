# Painel lateral no celular: só o ☰ — design curto

**Por quê:** pedido do dono (2026-11-23). No celular, a coluna de ícones recolhida (48px, com Modelos,
Importar, Usuários e tema) toma espaço do mapa.

**Abordagens:**
- (escolhida) Só CSS abaixo de 900px: recolhido, o painel vira um botão ☰ flutuante; aberto, abre por cima
  do mapa com um fundo escurecido que fecha ao toque. O computador fica igual.
- Gaveta do Material (`mat-sidenav`): troca a estrutura da página inteira, mais risco e nenhum ganho.
- Pôr o ☰ dentro da barra de ferramentas do mapa: mistura navegação com ferramentas de desenho.

**Decisões:**
- Mesmo corte das fichas (900px).
- O ☰ fica em `top/left 12px`, com 40px (a largura da barra de ferramentas), e a barra desce para `top 60px`.
- Aberto: até 260px ou 82% da tela, `z-index` 1300 (acima das fichas), e o fundo é um botão "Fechar painel".
- Os atalhos Importar e Usuários continuam no painel aberto (RI-40 (a) segue valendo no computador).

**Testes:** o botão recolhido tem o ícone `menu`, e tocar no fundo recolhe o painel. O visual só aparece
no navegador, porque o jsdom não aplica as media queries.
