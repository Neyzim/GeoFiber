import { Marker, Popup } from 'react-leaflet';
import { useState } from 'react';
import useMapClick from '../hooks/useMapClick';
import type { MarkerData } from '../types/MarkerData';
import type { ActiveToolProps } from '../types/ActiveToolProps';
import { markerIcons } from '../types/MarkerIcons';

const CreateMapMarker = ({activeTool}: ActiveToolProps) => {

    const [markers, setMarkers] = useState<MarkerData[]>([]);

   

    useMapClick({
      onMapClick(position){
      if(!activeTool || activeTool === 'cable'){
        return null;
      }
        setMarkers((prev) => [...prev,
      {
        id: Date.now(),
        type: activeTool,
        position
      }
      ]);
      }
    });
  return (
    <>
    {markers.map((marker) => {
      return <Marker key={marker.id}
        position={marker.position}
        icon={markerIcons[marker.type]}
      >
        <Popup>Marcador do tipo {marker.type}</Popup>

      </Marker>
    })}
    
    </>
    
  
  )
}

export default CreateMapMarker
