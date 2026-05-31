import { Marker, Popup } from 'react-leaflet';
import useMapClick from '../hooks/useMapClick';
import type { Dispatch, SetStateAction } from 'react';
import type { MarkerData } from '../types/MarkerData';
import type { ActiveToolProps } from '../types/ActiveToolProps';
import { markerIcons } from '../types/MarkerIcons';

type CreateMapMarkerProps = ActiveToolProps & {
  markers: MarkerData[];
  setMarkers: Dispatch<SetStateAction<MarkerData[]>>;
  onMarkerSelect: (selectedMarker: MarkerData) => void;
};

const CreateMapMarker = ({ activeTool, markers, setMarkers, onMarkerSelect }: CreateMapMarkerProps) => {

   

    useMapClick({
      onMapClick(position){
        if(!activeTool || activeTool === 'cable'){
          return null;
        }
        setMarkers((prev) => [
          ...prev,
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
      return (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={markerIcons[marker.type]}
          eventHandlers={{
            click: () => onMarkerSelect(marker),
          }}
        >
          <Popup>Marcador do tipo {marker.type}</Popup>
        </Marker>
      );
    })}
    
    </>
    
  
  )
}

export default CreateMapMarker
