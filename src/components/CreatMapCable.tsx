import useMapClick from '../hooks/useMapClick';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { CableData } from '../types/CableData';
import type { CreateMapCableProps } from '../types/CreateCableMapProps';

const vertexIcon = L.divIcon({
  className: 'vertex-handle',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const CreatMapCable = (
  { activeTool, currentCablePoints, setCurrentCablePoints, cables, onCableSelect, selectedCableId, isEditing, setCables, onCableUpdate }: CreateMapCableProps
) => {

  useMapClick({
    onMapClick(position){
      if(activeTool !== 'cable'){
        return null;
      }
      setCurrentCablePoints((prev) => [...prev, position]);
    }
  });
 
 
 return (
    <div>
      {cables.map((cable) => (
        <div key={cable.id}>
          <Polyline
            key={`${cable.id}-${cable.positions.length}-${cable.positions[0]?.lat ?? 0}-${cable.positions[0]?.lng ?? 0}`}
            positions={cable.positions}
            eventHandlers={{
              click: () => onCableSelect(cable),
            }}
            pathOptions={{
              color: selectedCableId === cable.id ? 'orange' : 'blue',
              weight: selectedCableId === cable.id ? 6 : 4,
            }}
          />

          {/* vertex handles for editing cable points */}
          {cable.positions.map((pos, idx) => {
            const isDraggable = selectedCableId === cable.id && isEditing;
            return (
              <Marker
                key={`${cable.id}-v-${idx}`}
                position={pos}
                icon={vertexIcon}
                draggable={isDraggable}
                eventHandlers={{
                  dragend: (e) => {
                    if (!isDraggable) return;
                    const latlng = (e as any).target.getLatLng();
                    const updatedCable = ((): CableData => {
                      const newPositions = cable.positions.map((p, i) => (i === idx ? latlng : p));
                      return { ...cable, positions: newPositions };
                    })();
                    setCables((prev) => prev.map((c) => (c.id !== cable.id ? c : updatedCable)));
                    onCableUpdate?.(updatedCable);
                  },
                  click: () => onCableSelect(cable),
                }}
              />
            );
          })}
        </div>
      ))}

      {/* current cable being created: show polyline and draggable vertices */}
      <Polyline
        key={`current-${currentCablePoints.length}-${currentCablePoints[0]?.lat ?? 0}-${currentCablePoints[0]?.lng ?? 0}`}
        positions={currentCablePoints}
        pathOptions={{ color: 'gray', dashArray: '4 4' }}
      />
      {currentCablePoints.map((pos, idx) => (
        <Marker
          key={`current-v-${idx}`}
          position={pos}
          icon={vertexIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const latlng = (e as any).target.getLatLng();
              setCurrentCablePoints((prev) => prev.map((p, i) => (i === idx ? latlng : p)));
            }
          }}
        />
      ))}
      
    </div>
  )
}

export default CreatMapCable
