import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer } from 'react-leaflet'
import '../App.css'
import { useState } from 'react';
import ToolsSideBar from './ToolsSideBar';
import type { Tool } from '../types/Tool';
import CreateMapMarker from './CreateMapMarker';
import CreatMapCable from './CreatMapCable';
import SelectedElementScreen from './SelectedElementScreen';
import type { CableData } from '../types/CableData';
import type { LatLng } from 'leaflet';
import type { MarkerData } from '../types/MarkerData';
import type { SelectedItem } from '../types/SelectedItem';
import SaveCable from '../services/SaveCable';

const LeafletMap = () => {

    // Map Configuration Parameters
    const center: [number, number] = [-10.657828093749963, -51.57021941122482];
    const zoomLevel: number = 13;
    const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    // Active Tool State
    const [activeTool, setActiveTool] = useState<Tool>(null);
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [markers, setMarkers] = useState<MarkerData[]>([]);
  
    // Cable Creation State
    const [cables, setCables] = useState<CableData[]>([]);
    const [currentCablePoints, setCurrentCablePoints] = useState<LatLng[]>([]);

    // Handle Cable Save
    const handleSaveCable = () => {
      SaveCable({currentCablePoints, setCables, setCurrentCablePoints, activeTool, cables})
      setActiveTool(null);
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
    <CreateMapMarker
      activeTool={activeTool}
      markers={markers}
      setMarkers={setMarkers}
      selectedMarkerId={selectedItem?.kind === 'marker' ? selectedItem.item.id : undefined}
      isEditing={isEditing}
      onMarkerSelect={(marker) => {
        setSelectedItem({ kind: 'marker', item: marker });
        setActiveTool(null);
        setIsEditing(false);
      }}
      onMarkerUpdate={(updatedMarker) => {
        if (selectedItem?.kind === 'marker' && selectedItem.item.id === updatedMarker.id) {
          setSelectedItem({ kind: 'marker', item: updatedMarker });
        }
      }}
    />
    <CreatMapCable
      activeTool={activeTool}
      currentCablePoints={currentCablePoints}
      setCurrentCablePoints={setCurrentCablePoints}
      cables={cables}
      setCables={setCables}
      onCableSelect={(cable) => {
        setSelectedItem({ kind: 'cable', item: cable });
        setActiveTool(null);
        setIsEditing(false);
      }}
      selectedCableId={selectedItem?.kind === 'cable' ? selectedItem.item.id : undefined}
      isEditing={isEditing}
      onCableUpdate={(updatedCable) => {
        if (selectedItem?.kind === 'cable' && selectedItem.item.id === updatedCable.id) {
          setSelectedItem({ kind: 'cable', item: updatedCable });
        }
      }}
    />
  </MapContainer>
  

  <SelectedElementScreen
    selectedItem={selectedItem}
    isEditing={isEditing}
    onClearSelection={() => {
      setSelectedItem(null);
      setIsEditing(false);
    }}
    onToggleEdit={() => setIsEditing((prev) => !prev)}
    onDeleteSelectedItem={() => {
      if (!selectedItem) return;
      if (selectedItem.kind === 'marker') {
        setMarkers((prev) => prev.filter((m) => m.id !== selectedItem.item.id));
      }
      if (selectedItem.kind === 'cable') {
        setCables((prev) => prev.filter((c) => c.id !== selectedItem.item.id));
      }
      setSelectedItem(null);
      setIsEditing(false);
    }}
    onUpdateSelectedItem={(updated) => {
      if (updated.kind === 'marker') {
        setMarkers((prev) => prev.map((m) => (m.id === updated.item.id ? updated.item : m)));
      } else {
        setCables((prev) => prev.map((c) => (c.id === updated.item.id ? updated.item : c)));
      }
      setSelectedItem(updated);
      setIsEditing(false);
    }}
  />
    </div>
  )
}

export default LeafletMap
