import useCreateMapMarker from '../hooks/useCreateMapMarker'
import { Marker, Popup } from 'react-leaflet';

const CreateMapMarker = () => {

    const position = useCreateMapMarker();

    if(!position){
        return null;
    }
  return (
 
      <Marker position={position}>
        <Popup>Marcador genérico</Popup>
      </Marker>
  
  )
}

export default CreateMapMarker
