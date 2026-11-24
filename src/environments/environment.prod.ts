/**
 * Ambiente de produção (`ng build`). A API fica no mesmo endereço do site, em `/api/v1`: o servidor
 * que publica o front encaminha `/api/` para o backend. Assim não há CORS e o cookie da sessão
 * (`secure`, `SameSite=Strict`) funciona. Se a API ficar em outro endereço, troque aqui (sempre https,
 * no mesmo site, ex.: `https://api.seudominio.com.br/api/v1`).
 */
export const environment = {
  apiBaseUrl: '/api/v1',
};
