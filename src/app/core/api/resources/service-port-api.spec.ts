import { ServicePortRequest } from '../api-types';
import { ServicePortApi } from './service-port-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const port: ServicePortRequest = { portNumber: 1, fiberId: 'f1' };

describeEndpoints(ServicePortApi, [
  { name: 'list', call: (api) => api.list('b1'), method: 'GET', path: '/boxes/b1/service-ports' },
  {
    name: 'create',
    call: (api) => api.create('b1', port),
    method: 'POST',
    path: '/boxes/b1/service-ports',
    body: port,
  },
  {
    name: 'update',
    call: (api) => api.update('b1', 'p1', port),
    method: 'PUT',
    path: '/boxes/b1/service-ports/p1',
    body: port,
  },
  {
    name: 'delete',
    call: (api) => api.delete('b1', 'p1'),
    method: 'DELETE',
    path: '/boxes/b1/service-ports/p1',
  },
]);
