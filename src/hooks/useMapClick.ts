import type { LeafletMouseEvent } from "leaflet";
import { useMapEvents } from "react-leaflet";
import type { OnMapClickProps } from "../types/OnMapClickProps";


export default function useMapClick ({onMapClick} : OnMapClickProps) {


    useMapEvents({
        click(e: LeafletMouseEvent ) {
            onMapClick(e.latlng);
        },

        
    });
};