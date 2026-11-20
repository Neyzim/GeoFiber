import { OltPortRequest, OltRequest } from '../api-types';
import { OltApi } from './olt-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const olt: OltRequest = { name: 'OLT-CENTRO', location: { longitude: -46.6, latitude: -23.5 } };
const port: OltPortRequest = { slotNumber: 1, portNumber: 1 };

describeEndpoints(OltApi, [
  { name: 'list', call: (api) => api.list(), method: 'GET', path: '/olts' },
  { name: 'get', call: (api) => api.get('o1'), method: 'GET', path: '/olts/o1' },
  { name: 'create', call: (api) => api.create(olt), method: 'POST', path: '/olts', body: olt },
  { name: 'update', call: (api) => api.update('o1', olt), method: 'PUT', path: '/olts/o1', body: olt },
  { name: 'delete', call: (api) => api.delete('o1'), method: 'DELETE', path: '/olts/o1' },
  { name: 'listPorts', call: (api) => api.listPorts('o1'), method: 'GET', path: '/olts/o1/ports' },
  {
    name: 'createPort',
    call: (api) => api.createPort('o1', port),
    method: 'POST',
    path: '/olts/o1/ports',
    body: port,
  },
  {
    name: 'updatePort',
    call: (api) => api.updatePort('o1', 'p1', port),
    method: 'PUT',
    path: '/olts/o1/ports/p1',
    body: port,
  },
  {
    name: 'deletePort',
    call: (api) => api.deletePort('o1', 'p1'),
    method: 'DELETE',
    path: '/olts/o1/ports/p1',
  },
  { name: 'listCables', call: (api) => api.listCables('o1'), method: 'GET', path: '/olts/o1/cables' },
]);
