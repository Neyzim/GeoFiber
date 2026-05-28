import type { LatLng } from "leaflet";
import type { MarkerType } from "./MarkerType";

export type MarkerData = {
  id: number;
  type: MarkerType;
  position: LatLng;
};