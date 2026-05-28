import type { LatLng } from "leaflet"

export type OnMapClickProps ={
    onMapClick: (position: LatLng) => void;
}