import type { SelectedItem } from '../types/SelectedItem';

type SelectedElementScreenProps = {
  selectedItem: SelectedItem | null;
  onClearSelection: () => void;
  onDeleteSelectedItem: () => void;
};

const SelectedElementScreen = ({ selectedItem, onClearSelection, onDeleteSelectedItem }: SelectedElementScreenProps) => {
  if (!selectedItem) {
    return null;
  }

  return (
    <div className="selection-overlay">
      <div className="selection-card">
        <header>
          <h2>{selectedItem.kind === 'marker' ? 'Marcador selecionado' : 'Cabo selecionado'}</h2>
          <button className="selection-close" onClick={onClearSelection}>
            Fechar
          </button>
        </header>

        {selectedItem.kind === 'marker' ? (
          <div>
            <p><strong>Tipo:</strong> {selectedItem.item.type}</p>
            <p><strong>ID:</strong> {selectedItem.item.id}</p>
            <p><strong>Latitude:</strong> {selectedItem.item.position.lat.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {selectedItem.item.position.lng.toFixed(6)}</p>
            <button className="selection-delete" onClick={onDeleteSelectedItem}>
              Excluir marcador
            </button>
          </div>
        ) : (
          <div>
            <p><strong>ID do cabo:</strong> {selectedItem.item.id}</p>
            <p><strong>Pontos do cabo:</strong> {selectedItem.item.positions.length}</p>
            <p><strong>Primeiro ponto:</strong> {selectedItem.item.positions[0]?.lat.toFixed(6)}, {selectedItem.item.positions[0]?.lng.toFixed(6)}</p>
            <p><strong>Último ponto:</strong> {selectedItem.item.positions[selectedItem.item.positions.length - 1]?.lat.toFixed(6)}, {selectedItem.item.positions[selectedItem.item.positions.length - 1]?.lng.toFixed(6)}</p>
            <button className="selection-delete" onClick={onDeleteSelectedItem}>
              Excluir cabo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedElementScreen;
