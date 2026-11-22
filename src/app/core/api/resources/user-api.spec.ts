import { describeEndpoints } from '../../../../testing/api-endpoints';
import { CreateUserRequest } from '../api-types';
import { UserApi } from './user-api';

const user: CreateUserRequest = { name: 'Ana', email: 'ana@x.com', password: 'senha-com-dez', role: 'MEMBER' };

describeEndpoints(UserApi, [
  { name: 'list', call: (api) => api.list(), method: 'GET', path: '/users' },
  { name: 'create', call: (api) => api.create(user), method: 'POST', path: '/users', body: user },
  {
    name: 'setActive',
    call: (api) => api.setActive('u1', false),
    method: 'PATCH',
    path: '/users/u1/active',
    body: { active: false },
  },
  {
    name: 'resetPassword',
    call: (api) => api.resetPassword('u1', 'senha-nova-123'),
    method: 'PUT',
    path: '/users/u1/password',
    body: { password: 'senha-nova-123' },
  },
]);
