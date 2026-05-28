import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Popup, Marker } from 'react-leaflet'
import '../App.css'
import { useState } from 'react';
import ToolsSideBar from './ToolsSideBar';
import type { Tool } from '../types/Tool';
import CreateMapMarker from './CreateMapMarker';

 

const LeafletMap = () => {
  const [activeTool, setActiveTool] = useState<Tool>(null);

    const position: [number, number] = [51.505, -0.09];
    const center: [number, number] = [51.505, -0.09];
    const zoomLevel: number = 13;

    const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    
  return (
    <div className='map-wrapper'>
    <ToolsSideBar setActiveTool={setActiveTool} activeTool={activeTool}/>
    <MapContainer 
    center={center} 
    zoom={zoomLevel} 
    scrollWheelZoom={true} 
    id='map-container'>
    
        <TileLayer
            attribution={attr}
            url={mapUrl}
        />
  <Marker position={position}>
    <Popup>
      A pretty CSS3 popup. <br /> Easily customizable.
    </Popup>
  </Marker>
    <CreateMapMarker activeTool={activeTool} />

</MapContainer>
      
    </div>
  )
}

export default LeafletMap
