import type { LatLng } from "leaflet"

export type CableData = {
    id: number;
    positions: LatLng[];
    name: string;
    capacity: number;
    occupancy: number;
    observations?: string;
}