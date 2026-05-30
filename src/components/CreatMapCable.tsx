import useMapClick from '../hooks/useMapClick';
import { Polyline } from 'react-leaflet';
import type { CreateMapCableProps } from '../types/CreateCableMapProps';

const CreatMapCable = (
  {activeTool, currentCablePoints,
  setCurrentCablePoints, cables} : CreateMapCableProps
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
        <Polyline key={cable.id} positions={cable.positions} />
      ))}
      <Polyline positions={currentCablePoints}/>
      
    </div>
  )
}

export default CreatMapCable
