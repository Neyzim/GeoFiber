import { ImportNetworkRequest } from '../import-types';
import { ImportApi } from './import-api';
import { describeEndpoints } from '../../../../testing/api-endpoints';

const body: ImportNetworkRequest = { usageStatus: 'INSTALLED', elements: [], cables: [] };

describeEndpoints(ImportApi, [
  {
    name: 'importNetwork',
    call: (api) => api.importNetwork(body),
    method: 'POST',
    path: '/imports/network',
    body,
  },
]);
