import useMapClick from '../hooks/useMapClick';
import { Polyline } from 'react-leaflet';
import type { CreateMapCableProps } from '../types/CreateCableMapProps';

const CreatMapCable = (
  { activeTool, currentCablePoints, setCurrentCablePoints, cables, onCableSelect, selectedCableId }: CreateMapCableProps
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
        <Polyline
          key={cable.id}
          positions={cable.positions}
          eventHandlers={{
            click: () => onCableSelect(cable),
          }}
          pathOptions={{
            color: selectedCableId === cable.id ? 'orange' : 'blue',
            weight: selectedCableId === cable.id ? 6 : 4,
          }}
        />
      ))}
      <Polyline
        positions={currentCablePoints}
        pathOptions={{ color: 'gray', dashArray: '4 4' }}
      />
      
    </div>
  )
}

export default CreatMapCable
