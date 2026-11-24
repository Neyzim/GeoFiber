import * as L from 'leaflet';
import { createMarkerClusterGroup } from './marker-cluster';

describe('createMarkerClusterGroup', () => {
  it('creates a cluster group with the given options', () => {
    const group = createMarkerClusterGroup({ disableClusteringAtZoom: 17 });

    expect(group).toBeInstanceOf(L.FeatureGroup);
    expect((group.options as L.MarkerClusterGroupOptions).disableClusteringAtZoom).toBe(17);
  });
});
