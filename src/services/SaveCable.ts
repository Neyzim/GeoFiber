import type { CreateMapCableProps } from "../types/CreateCableMapProps";
 
type SaveCableProps = Omit<CreateMapCableProps, 'onCableSelect' | 'selectedCableId'>;
 
export default function SaveCable ({currentCablePoints, setCables, setCurrentCablePoints}: SaveCableProps) {
    if(currentCablePoints.length < 2){
      return;
    }
    setCables((prev) => [
      ...prev,
      {
        id: Date.now(),
        positions: currentCablePoints,
        name: '',
        capacity: 0,
        occupancy: 0,
        observations: ''
      }
    ])
    setCurrentCablePoints([]);
 }