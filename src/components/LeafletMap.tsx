import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer } from 'react-leaflet'
import '../App.css'
import { useState } from 'react';
import ToolsSideBar from './ToolsSideBar';
import type { Tool } from '../types/Tool';
import CreateMapMarker from './CreateMapMarker';
import CreatMapCable from './CreatMapCable';
import type { CableData } from '../types/CableData';
import type { LatLng } from 'leaflet';
import SaveCable from '../services/SaveCable';


const LeafletMap = () => {

    // Map Configuration Parameters
    const center: [number, number] = [-10.657828093749963, -51.57021941122482];
    const zoomLevel: number = 13;
    const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    // Active Tool State
    const [activeTool, setActiveTool] = useState<Tool>(null);
  
    // Cable Creation State
    const [cables, setCables] = useState<CableData[]>([]);
    const [currentCablePoints, setCurrentCablePoints] = useState<LatLng[]>([]);

    // Handle Cable Save
    const handleSaveCable = () => {
      SaveCable({currentCablePoints, setCables, setCurrentCablePoints, activeTool, cables})
    } 

  return (
    <div className='map-wrapper'>
    <ToolsSideBar setActiveTool={setActiveTool} activeTool={activeTool} finalizeCable={handleSaveCable}/>
    <MapContainer 
    center={center} 
    zoom={zoomLevel} 
    scrollWheelZoom={true} 
    id='map-container'>
        <TileLayer
            attribution={attr}
            url={mapUrl}
        /> 
  
    {/*Created Components */}
    <CreateMapMarker activeTool={activeTool} />
    <CreatMapCable  activeTool={activeTool} 
                    currentCablePoints={currentCablePoints}
                    setCurrentCablePoints={setCurrentCablePoints}
                    cables={cables}
                    setCables={setCables}
     />
</MapContainer>
    </div>
  )
}

export default LeafletMap
