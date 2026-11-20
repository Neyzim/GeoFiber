import { TrayRequest } from '../api-types';
import { TrayApi } from './tray-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const tray: TrayRequest = { trayNumber: 1, capacity: 12 };

describeEndpoints(TrayApi, [
  { name: 'list', call: (api) => api.list('b1'), method: 'GET', path: '/boxes/b1/trays' },
  {
    name: 'create',
    call: (api) => api.create('b1', tray),
    method: 'POST',
    path: '/boxes/b1/trays',
    body: tray,
  },
  {
    name: 'update',
    call: (api) => api.update('b1', 'tr1', tray),
    method: 'PUT',
    path: '/boxes/b1/trays/tr1',
    body: tray,
  },
  { name: 'delete', call: (api) => api.delete('b1', 'tr1'), method: 'DELETE', path: '/boxes/b1/trays/tr1' },
]);
