import { SpliceRequest } from '../api-types';
import { SpliceApi } from './splice-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const splice: SpliceRequest = { trayNumber: 1, inputFiberId: 'f1', outputFiberId: 'f2' };

describeEndpoints(SpliceApi, [
  { name: 'list', call: (api) => api.list('b1'), method: 'GET', path: '/boxes/b1/splices' },
  {
    name: 'create',
    call: (api) => api.create('b1', splice),
    method: 'POST',
    path: '/boxes/b1/splices',
    body: splice,
  },
  { name: 'delete', call: (api) => api.delete('b1', 's1'), method: 'DELETE', path: '/boxes/b1/splices/s1' },
]);
