import { FiberRequest, FiberStatusRequest } from '../api-types';
import { FiberApi } from './fiber-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const fiber: FiberRequest = { numberInTube: 1, absoluteNumber: 1, color: 'GREEN' };
const status: FiberStatusRequest = { status: 'BROKEN' };

describeEndpoints(FiberApi, [
  { name: 'list', call: (api) => api.list('t1'), method: 'GET', path: '/tubes/t1/fibers' },
  {
    name: 'create',
    call: (api) => api.create('t1', fiber),
    method: 'POST',
    path: '/tubes/t1/fibers',
    body: fiber,
  },
  {
    name: 'update',
    call: (api) => api.update('t1', 'f1', fiber),
    method: 'PUT',
    path: '/tubes/t1/fibers/f1',
    body: fiber,
  },
  { name: 'delete', call: (api) => api.delete('t1', 'f1'), method: 'DELETE', path: '/tubes/t1/fibers/f1' },
  {
    name: 'setStatus',
    call: (api) => api.setStatus('t1', 'f1', status),
    method: 'PUT',
    path: '/tubes/t1/fibers/f1/status',
    body: status,
  },
]);
