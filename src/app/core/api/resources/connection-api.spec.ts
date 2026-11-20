import { ConnectionRequest } from '../api-types';
import { ConnectionApi } from './connection-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const connection: ConnectionRequest = {
  fiberAId: 'f1',
  fiberAEnd: 'B',
  fiberBId: 'f2',
  fiberBEnd: 'A',
};

describeEndpoints(ConnectionApi, [
  { name: 'list', call: (api) => api.list('b1'), method: 'GET', path: '/boxes/b1/connections' },
  {
    name: 'create',
    call: (api) => api.create('b1', connection),
    method: 'POST',
    path: '/boxes/b1/connections',
    body: connection,
  },
  {
    name: 'delete',
    call: (api) => api.delete('b1', 'cn1'),
    method: 'DELETE',
    path: '/boxes/b1/connections/cn1',
  },
]);
