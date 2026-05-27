import type { LatLng, LeafletMouseEvent } from "leaflet";
import { useState } from "react";
import { useMapEvents } from "react-leaflet";


export default function () {

    const [position, setPosition] = useState<LatLng>();

    const map = useMapEvents({
        click(e: LeafletMouseEvent ) {
            setPosition(e.latlng);
        },


    
        
    });

    return position;
};