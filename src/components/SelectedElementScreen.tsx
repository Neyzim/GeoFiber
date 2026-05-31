import { useEffect, useState } from 'react';
import type { SelectedItem } from '../types/SelectedItem';

type SelectedElementScreenProps = {
  selectedItem: SelectedItem | null;
  isEditing: boolean;
  onToggleEdit: () => void;
  onClearSelection: () => void;
  onDeleteSelectedItem: () => void;
  onUpdateSelectedItem: (updated: SelectedItem) => void;
};

const SelectedElementScreen = ({ selectedItem, isEditing, onToggleEdit, onClearSelection, onDeleteSelectedItem, onUpdateSelectedItem }: SelectedElementScreenProps) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [occupancy, setOccupancy] = useState<number>(0);
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (!selectedItem) return;
    setName(selectedItem.item.name ?? '');
    setCapacity(selectedItem.item.capacity ?? 0);
    setOccupancy(selectedItem.item.occupancy ?? 0);
    setObservations(selectedItem.item.observations ?? '');
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem || isEditing) return;
    setName(selectedItem.item.name ?? '');
    setCapacity(selectedItem.item.capacity ?? 0);
    setOccupancy(selectedItem.item.occupancy ?? 0);
    setObservations(selectedItem.item.observations ?? '');
  }, [isEditing, selectedItem]);

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
          <input disabled={!isEditing} value={name} onChange={(e) => setName(e.target.value)} />

          <label>Capacidade</label>
          <input disabled={!isEditing} type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />

          <label>Ocupação</label>
          <input disabled={!isEditing} type="number" value={occupancy} onChange={(e) => setOccupancy(Number(e.target.value))} />

          <label>Observações</label>
          <textarea disabled={!isEditing} value={observations} onChange={(e) => setObservations(e.target.value)} />

          <div className="selection-actions">
            <button className="selection-save" onClick={handleSave} disabled={!isEditing}>Salvar</button>
            <button className="selection-edit" onClick={onToggleEdit}>
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
            <button className="selection-delete" onClick={onDeleteSelectedItem}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedElementScreen;
