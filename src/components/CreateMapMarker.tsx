import { Marker, Popup } from 'react-leaflet';
import useMapClick from '../hooks/useMapClick';
import type { Dispatch, SetStateAction } from 'react';
import type { MarkerData } from '../types/MarkerData';
import type { ActiveToolProps } from '../types/ActiveToolProps';
import { markerIcons } from '../types/MarkerIcons';

type CreateMapMarkerProps = ActiveToolProps & {
  markers: MarkerData[];
  setMarkers: Dispatch<SetStateAction<MarkerData[]>>;
  selectedMarkerId?: number;
  isEditing?: boolean;
  onMarkerSelect: (selectedMarker: MarkerData) => void;
  onMarkerUpdate?: (updatedMarker: MarkerData) => void;
};

const CreateMapMarker = ({ activeTool, markers, setMarkers, selectedMarkerId, isEditing, onMarkerSelect, onMarkerUpdate }: CreateMapMarkerProps) => {

   

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
                position,
                name: '',
                capacity: 0,
                occupancy: 0,
                observations: ''
              }
            ]);
      }
    });
  return (
    <>
    {markers.map((marker) => {
      const isDraggable = marker.id === selectedMarkerId && isEditing;
      return (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={markerIcons[marker.type]}
          draggable={isDraggable}
          eventHandlers={{
            click: () => onMarkerSelect(marker),
            dragend: (e) => {
              if (!isDraggable) return;
              const latlng = (e as any).target.getLatLng();
              const updatedMarker = { ...marker, position: latlng };
              setMarkers((prev) => prev.map((m) => (m.id === marker.id ? updatedMarker : m)));
              if (onMarkerUpdate) {
                onMarkerUpdate(updatedMarker);
              }
            },
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
