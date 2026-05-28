import L from "leaflet";
import sinalImg from '../assets/sinal.png'

export const CtoIcon = L.icon({
    iconUrl: sinalImg,
    iconSize: [100, 100],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});