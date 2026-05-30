import L from "leaflet";
import ctoIcon from '../assets/cto.png'
import ceoIcon from '../assets/ceo.png'
import utilityPoleIcon from '../assets/utility-pole.png'


export const CtoIcon = L.icon({
    iconUrl: ctoIcon,
    iconSize: [100, 100],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

export const CeoIcon = L.icon({
    iconUrl: ceoIcon,
    iconSize: [100, 100],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

export const UtilityPoleIcon = L.icon({
    iconUrl: utilityPoleIcon,
    iconSize: [100, 100],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});