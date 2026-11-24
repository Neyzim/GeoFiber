# GeoFiber — Frontend

Frontend open source do **GeoFiber**, aplicação para documentar redes FTTH no mapa: OLTs, cabos,
tubos e fibras, caixas (CTO/CEO/DIO), emendas, splitters, portas de atendimento e clientes.

Feito para dois públicos:

- **o técnico**, que cadastra e documenta a rede;
- **quem tem menos conhecimento técnico**, que navega na documentação e entende o que está acontecendo.

Toda a rede é guardada pelo backend do GeoFiber (repositório `geofiber-backend`, em Spring Boot + PostGIS).
Este projeto é só a interface.

## Pré-requisitos

- Node.js e npm (o projeto usa npm 11).
- Backend do GeoFiber rodando em `http://localhost:8080`, com CORS liberado para
  `http://localhost:4200`. Veja o `API.md` do backend para subir o banco e a API.

## Como rodar

```bash
npm install      # instala as dependências
npm start        # sobe em http://localhost:4200
npm test         # roda os testes (Vitest)
npm run build    # gera a versão de produção em dist/
```

## Configuração

A URL da API fica em `src/environments/environment.ts` (desenvolvimento, `npm start`):

```ts
export const environment = {
  apiBaseUrl: 'http://localhost:8080/api/v1',
};
```

### Publicar (produção)

`npx ng build` troca o arquivo por `src/environments/environment.prod.ts`, que usa `/api/v1` no
mesmo endereço do site. O servidor que publica a pasta `dist/geofiber/browser` deve:

- servir tudo por **https** (o cookie da sessão é `Secure`);
- encaminhar `/api/` para o backend (proxy reverso). Assim não há CORS e o cookie `SameSite=Strict`
  funciona. Se a API ficar em outro endereço, use o mesmo site (ex.: `api.seudominio.com.br`), troque
  o `environment.prod.ts` e libere a origem do front em `CORS_ALLOWED_ORIGINS`;
- devolver `index.html` para as rotas do app (`/entrar`, `/importar`, `/caixas/...`).

No backend de produção: `API_DOCS_ENABLED` sem valor (Swagger desligado), `GEOFIBER_JWT_SECRET`
forte e, atrás de proxy, `server.forward-headers-strategy=native` (o limite de tentativas de login
usa o IP do cliente). O build de produção não gera source maps.

Toda chamada à API envia `Accept-Language: pt-BR`, para as mensagens de validação virem em português.

## Tipos da API

Os tipos TypeScript das requisições e respostas são gerados a partir do OpenAPI do backend e
ficam em `src/app/core/api/generated/schema.d.ts` (não edite à mão). Quando o backend mudar,
com ele rodando:

```bash
npm run api:types
```

Use os tipos pelos aliases de `src/app/core/api/api-types.ts` (ex.: `BoxResponse`, `CableRole`).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/app/core/api/` | Comunicação com o backend: URL, idioma, tipos, coordenadas, erros e um serviço por recurso (`resources/`). |
| `src/app/core/auth/` | Sessão: login, refresh por cookie (um só em andamento), renovação, logout, interceptor (Bearer + `withCredentials`) e guardas das rotas. |
| `src/app/features/auth/` | Página `/entrar`. |
| `src/app/features/users/` | Página `/usuarios` (só administrador): lista de contas, desativar/reativar, trocar senha, cadastrar. |
| `src/app/core/network/` | Camada do mapa: catálogo visual, conversão para marcadores/linhas, repositório (fala com a API) e estado da tela. |
| `src/app/features/network-map/cable-sheet/` | Ficha do cabo: por onde passa (lista editável), tubos e fibras. |
| `src/app/features/network-map/box-sheet/` | Ficha da caixa: resumo das fusões, conectores, splitters e portas de atendimento. |
| `src/app/features/box-splices/` | Diagrama de fusões (`/caixas/:boxId/fusoes`): uma aba por cabo com o destino de cada fibra, gaveta com o desenho da ligação e emenda por dois toques (a bandeja é escolhida ou criada sozinha). |
| `src/app/core/import/` | Importação de KMZ/KML: leitura do arquivo e do KML, agrupamento, reconhecimento de duplicados, prévia e montagem do pedido. |
| `src/app/features/impact/` | Impacto de manutenção: ficha com os clientes, caixas e OLTs que ficam sem sinal se um cabo, caixa ou OLT sair (só leitura). |
| `src/app/features/trace/` | Rastreio da fibra: ficha com o caminho até a OLT ou até os clientes, quebras e saídas do splitter (só leitura). |
| `src/app/features/network-import/` | Tela `/importar`: escolher o arquivo, decidir o tipo de cada grupo e importar de uma vez. |
| `src/app/features/network-map/olt-sheet/` | Ficha da OLT: portas PON por placa e ligação com as fibras. |
| `src/app/features/network-map/customer-sheet/` | Ficha do cliente: situação, quem atende e histórico. |
| `src/app/shared/help/` | Ajuda para leigos: glossário, "?" nos termos e "O que estou vendo?". |
| `src/app/shared/common/` | Peças do visual "Esquema Unifilar": bolinha de fibra ABNT, selo de ocupação ("3/12"), abas das fichas e a gaveta arrastável do celular (`appSheetDrag`). |
| `src/app/shared/diagram/` | Linha "chega → elemento → sai" do topo das fichas e diagrama de cada emenda. |
| `src/theme/` | `_tokens.scss`: cores (tema claro/escuro), raios, sombra e fontes `--gf-*` usados em todo o app. |
| `src/app/core/` | Modelos, constantes e serviços de estado (tema, preferências, modelos de rede). |
| `src/app/features/` | Telas (mapa da rede, fusões da caixa, modelos). |
| `src/app/shared/` | Componentes reutilizáveis (mapa Leaflet, legenda, formulários de OLT, caixa e cabo). |
| `src/testing/` | Utilitários usados só pelos testes. |

## Documentação

- [`docs/SPECS.md`](docs/SPECS.md) — especificação do frontend: o que faz e quais regras segue.
- [`docs/GUIA.md`](docs/GUIA.md) — guia de uso e glossário em linguagem simples.
- [`docs/ROTEIRO-TESTE-USABILIDADE.md`](docs/ROTEIRO-TESTE-USABILIDADE.md) — roteiro para testar o sistema com um técnico.
- [Roadmap](docs/superpowers/specs/2026-11-19-frontend-roadmap-design.md) — etapas de integração com o backend.

## Login e backend

Todas as telas exigem login (`/entrar`). O token de acesso fica só em memória; o refresh vem num
cookie httpOnly `Secure`, aceito pelo navegador só em HTTPS ou em `http://localhost`. A origem do
front precisa estar em `CORS_ALLOWED_ORIGINS` no backend (padrão `http://localhost:4200`). O primeiro
usuário administrador é criado pelo backend na primeira subida (variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`).
Os demais usuários são cadastrados, desativados e têm a senha trocada pelo administrador em
**Usuários**, no painel lateral do mapa (`/usuarios`).
