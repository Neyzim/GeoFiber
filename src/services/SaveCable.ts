import type { CreateMapCableProps } from "../types/CreateCableMapProps";
 
export default function SaveCable ({currentCablePoints, setCables,setCurrentCablePoints}: CreateMapCableProps) {
    if(currentCablePoints.length < 2){
      return;
    }
    setCables((prev) => [
      ...prev,
      {
        id: Date.now(),
        positions: currentCablePoints
        
      }
    ])
    setCurrentCablePoints([]);
 }