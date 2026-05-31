import type { CableData } from './CableData';
import type { MarkerData } from './MarkerData';

export type SelectedItem =
  | {
      kind: 'marker';
      item: MarkerData;
    }
  | {
      kind: 'cable';
      item: CableData;
    };
