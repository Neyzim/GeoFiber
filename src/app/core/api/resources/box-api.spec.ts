import { BoxRequest } from '../api-types';
import { BoxApi } from './box-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const box: BoxRequest = {
  name: 'CTO-01',
  type: 'CTO',
  location: { longitude: -46.6, latitude: -23.5 },
};

describeEndpoints(BoxApi, [
  { name: 'list', call: (api) => api.list(), method: 'GET', path: '/boxes' },
  { name: 'get', call: (api) => api.get('b1'), method: 'GET', path: '/boxes/b1' },
  { name: 'create', call: (api) => api.create(box), method: 'POST', path: '/boxes', body: box },
  { name: 'update', call: (api) => api.update('b1', box), method: 'PUT', path: '/boxes/b1', body: box },
  { name: 'delete', call: (api) => api.delete('b1'), method: 'DELETE', path: '/boxes/b1' },
  { name: 'listCables', call: (api) => api.listCables('b1'), method: 'GET', path: '/boxes/b1/cables' },
  { name: 'overview', call: (api) => api.overview('b1'), method: 'GET', path: '/boxes/b1/overview' },
]);
