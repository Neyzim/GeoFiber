import { CableAttachmentRequest, CableRequest, LooseTubeRequest } from '../api-types';
import { CableApi } from './cable-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const cable: CableRequest = {
  name: 'FEEDER-01',
  role: 'FEEDER',
  fiberCapacity: 12,
  coordinates: [
    { longitude: -46.6333, latitude: -23.5505 },
    { longitude: -46.632, latitude: -23.551 },
  ],
};
const tube: LooseTubeRequest = { tubeNumber: 1, capacity: 12, color: 'GREEN' };
const attachments: CableAttachmentRequest[] = [
  { role: 'START', oltId: 'o1' },
  { role: 'END', boxId: 'b1' },
];

describeEndpoints(CableApi, [
  { name: 'list', call: (api) => api.list(), method: 'GET', path: '/cables' },
  { name: 'get', call: (api) => api.get('c1'), method: 'GET', path: '/cables/c1' },
  { name: 'create', call: (api) => api.create(cable), method: 'POST', path: '/cables', body: cable },
  {
    name: 'update',
    call: (api) => api.update('c1', cable),
    method: 'PUT',
    path: '/cables/c1',
    body: cable,
  },
  { name: 'delete', call: (api) => api.delete('c1'), method: 'DELETE', path: '/cables/c1' },
  { name: 'listTubes', call: (api) => api.listTubes('c1'), method: 'GET', path: '/cables/c1/tubes' },
  {
    name: 'createTube',
    call: (api) => api.createTube('c1', tube),
    method: 'POST',
    path: '/cables/c1/tubes',
    body: tube,
  },
  {
    name: 'updateTube',
    call: (api) => api.updateTube('c1', 't1', tube),
    method: 'PUT',
    path: '/cables/c1/tubes/t1',
    body: tube,
  },
  {
    name: 'deleteTube',
    call: (api) => api.deleteTube('c1', 't1'),
    method: 'DELETE',
    path: '/cables/c1/tubes/t1',
  },
  {
    name: 'listAttachments',
    call: (api) => api.listAttachments('c1'),
    method: 'GET',
    path: '/cables/c1/attachments',
  },
  {
    name: 'setAttachments',
    call: (api) => api.setAttachments('c1', attachments),
    method: 'PUT',
    path: '/cables/c1/attachments',
    body: attachments,
  },
  {
    name: 'createStructure',
    call: (api) => api.createStructure('c1', { tubes: [tube] }),
    method: 'POST',
    path: '/cables/c1/structure',
    body: { tubes: [tube] },
  },
  { name: 'listFibers', call: (api) => api.listFibers('c1'), method: 'GET', path: '/cables/c1/fibers' },
]);
