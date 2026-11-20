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

A URL da API fica em `src/environments/environment.ts`:

```ts
export const environment = {
  apiBaseUrl: 'http://localhost:8080/api/v1',
};
```

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
| `src/app/core/network/` | Camada do mapa: catálogo visual, conversão para marcadores/linhas, repositório (fala com a API) e estado da tela. |
| `src/app/features/network-map/cable-sheet/` | Ficha do cabo: por onde passa (lista editável), tubos e fibras. |
| `src/app/features/network-map/box-sheet/` | Ficha da caixa: fusões, conectores, splitters e portas de atendimento. |
| `src/app/features/network-map/olt-sheet/` | Ficha da OLT: portas PON por placa e ligação com as fibras. |
| `src/app/features/network-map/customer-sheet/` | Ficha do cliente: situação, quem atende e histórico. |
| `src/app/shared/help/` | Ajuda para leigos: glossário, "?" nos termos e "O que estou vendo?". |
| `src/app/core/` | Modelos, constantes e serviços de estado (tema, preferências, modelos de rede). |
| `src/app/features/` | Telas (mapa da rede, modelos). |
| `src/app/shared/` | Componentes reutilizáveis (mapa Leaflet, legenda, formulários de OLT, caixa e cabo). |
| `src/testing/` | Utilitários usados só pelos testes. |

## Documentação

- [`docs/SPECS.md`](docs/SPECS.md) — especificação do frontend: o que faz e quais regras segue.
- [`docs/GUIA.md`](docs/GUIA.md) — guia de uso e glossário em linguagem simples.
- [Roadmap](docs/superpowers/specs/2026-11-19-frontend-roadmap-design.md) — etapas de integração com o backend.
