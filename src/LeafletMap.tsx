import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Popup, Marker } from 'react-leaflet'
import './App.css'
 

const LeafletMap = () => {

    const position: [number, number] = [51.505, -0.09];
    const center: [number, number] = [51.505, -0.09];
    const zoomLevel: number = 13;

    const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    
  return (
    <div >
    <MapContainer center={center} zoom={zoomLevel} scrollWheelZoom={false} id='map-container'>
  <TileLayer
    attribution={attr}
    url={mapUrl}
  />
  <Marker position={position}>
    <Popup>
      A pretty CSS3 popup. <br /> Easily customizable.
    </Popup>
  </Marker>
</MapContainer>
      
    </div>
  )
}

export default LeafletMap
