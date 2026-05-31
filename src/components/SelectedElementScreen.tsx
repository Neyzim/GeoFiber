import { useEffect, useState } from 'react';
import type { SelectedItem } from '../types/SelectedItem';

type SelectedElementScreenProps = {
  selectedItem: SelectedItem | null;
  onClearSelection: () => void;
  onDeleteSelectedItem: () => void;
  onUpdateSelectedItem: (updated: SelectedItem) => void;
};

const SelectedElementScreen = ({ selectedItem, onClearSelection, onDeleteSelectedItem, onUpdateSelectedItem }: SelectedElementScreenProps) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [occupancy, setOccupancy] = useState<number>(0);
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.kind === 'marker') {
      setName(selectedItem.item.name ?? '');
      setCapacity(selectedItem.item.capacity ?? 0);
      setOccupancy(selectedItem.item.occupancy ?? 0);
      setObservations(selectedItem.item.observations ?? '');
    } else {
      setName(selectedItem.item.name ?? '');
      setCapacity(selectedItem.item.capacity ?? 0);
      setOccupancy(selectedItem.item.occupancy ?? 0);
      setObservations(selectedItem.item.observations ?? '');
    }
  }, [selectedItem]);

  if (!selectedItem) {
    return null;
  }

  const handleSave = () => {
    if (!selectedItem) return;
    if (selectedItem.kind === 'marker') {
      onUpdateSelectedItem({
        kind: 'marker',
        item: {
          ...selectedItem.item,
          name,
          capacity,
          occupancy,
          observations,
        }
      });
    } else {
      onUpdateSelectedItem({
        kind: 'cable',
        item: {
          ...selectedItem.item,
          name,
          capacity,
          occupancy,
          observations,
        }
      });
    }
  };

  return (
    <div className="selection-overlay">
      <div className="selection-card">
        <header>
          <h2>{selectedItem.kind === 'marker' ? 'Marcador selecionado' : 'Cabo selecionado'}</h2>
          <button className="selection-close" onClick={onClearSelection}>
            Fechar
          </button>
        </header>

        <div>
          <p><strong>ID:</strong> {selectedItem.item.id}</p>
          {selectedItem.kind === 'marker' && (
            <p><strong>Tipo:</strong> {selectedItem.item.type}</p>
          )}

          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />

          <label>Capacidade</label>
          <input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />

          <label>Ocupação</label>
          <input type="number" value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} />

          <label>Observações</label>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="selection-save" onClick={handleSave}>Salvar</button>
            <button className="selection-delete" onClick={onDeleteSelectedItem}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedElementScreen;
