import { SplitterPortUpdateRequest, SplitterRequest } from '../api-types';
import { SplitterApi } from './splitter-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const splitter: SplitterRequest = { ratio: 'RATIO_1_8', balanced: true };
const port: SplitterPortUpdateRequest = { fiberId: 'f1' };

describeEndpoints(SplitterApi, [
  { name: 'list', call: (api) => api.list('b1'), method: 'GET', path: '/boxes/b1/splitters' },
  {
    name: 'create',
    call: (api) => api.create('b1', splitter),
    method: 'POST',
    path: '/boxes/b1/splitters',
    body: splitter,
  },
  {
    name: 'update',
    call: (api) => api.update('b1', 'sp1', splitter),
    method: 'PUT',
    path: '/boxes/b1/splitters/sp1',
    body: splitter,
  },
  {
    name: 'delete',
    call: (api) => api.delete('b1', 'sp1'),
    method: 'DELETE',
    path: '/boxes/b1/splitters/sp1',
  },
  {
    name: 'updatePort',
    call: (api) => api.updatePort('sp1', 'p1', port),
    method: 'PUT',
    path: '/splitters/sp1/ports/p1',
    body: port,
  },
]);
