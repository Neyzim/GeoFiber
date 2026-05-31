import type { LatLng } from "leaflet";
import type { Dispatch, SetStateAction } from "react";
import type { CableData } from "./CableData";
import type { Tool } from "./Tool";

export type CreateMapCableProps = {
  activeTool: Tool;
  cables: CableData[];
  setCables: Dispatch<SetStateAction<CableData[]>>;
  currentCablePoints: LatLng[];
  setCurrentCablePoints: Dispatch<SetStateAction<LatLng[]>>;
  onCableSelect: (selectedCable: CableData) => void;
  selectedCableId?: number;
  isEditing?: boolean;
  onCableUpdate?: (updatedCable: CableData) => void;
};