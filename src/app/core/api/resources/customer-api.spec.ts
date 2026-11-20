import { CustomerRequest } from '../api-types';
import { CustomerApi } from './customer-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const customer: CustomerRequest = {
  name: 'Maria',
  contractCode: 'CT-0001',
  location: { longitude: -46.6298, latitude: -23.5522 },
};

describeEndpoints(CustomerApi, [
  { name: 'list', call: (api) => api.list(), method: 'GET', path: '/customers' },
  { name: 'get', call: (api) => api.get('cu1'), method: 'GET', path: '/customers/cu1' },
  {
    name: 'create',
    call: (api) => api.create(customer),
    method: 'POST',
    path: '/customers',
    body: customer,
  },
  {
    name: 'update',
    call: (api) => api.update('cu1', customer),
    method: 'PUT',
    path: '/customers/cu1',
    body: customer,
  },
  { name: 'delete', call: (api) => api.delete('cu1'), method: 'DELETE', path: '/customers/cu1' },
  { name: 'history', call: (api) => api.history('cu1'), method: 'GET', path: '/customers/cu1/history' },
]);
