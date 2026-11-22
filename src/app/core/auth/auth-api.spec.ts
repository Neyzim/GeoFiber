import { describeEndpoints } from '../../../testing/api-endpoints';
import { AuthApi } from './auth-api';

const credentials = { email: 'ana@x.com', password: 'senha-com-dez' };

describeEndpoints(AuthApi, [
  { name: 'login', call: (api) => api.login(credentials), method: 'POST', path: '/auth/login', body: credentials },
  { name: 'refresh', call: (api) => api.refresh(), method: 'POST', path: '/auth/refresh', body: null },
  { name: 'logout', call: (api) => api.logout(), method: 'POST', path: '/auth/logout', body: null },
]);
