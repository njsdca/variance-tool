import { useState, useEffect } from 'react';
import { getDatasetList, deleteMonthlyData, renameMonthlyData, type DatasetInfo } from '../db/database';

interface DatasetManagerProps {
  onDataChange: () => void;
  refreshTrigger?: number;
}

export function DatasetManager({ onDataChange, refreshTrigger }: DatasetManagerProps) {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, [refreshTrigger]);

  const loadDatasets = async () => {
    const data = await getDatasetList();
    setDatasets(data);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await deleteMonthlyData(id);
      await loadDatasets();
      onDataChange();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      alert('Failed to delete dataset');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (dataset: DatasetInfo) => {
    setEditingId(dataset.id);
    setEditName(dataset.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;

    setIsLoading(true);
    try {
      await renameMonthlyData(id, editName.trim());
      await loadDatasets();
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error('Error renaming dataset:', error);
      alert('Failed to rename dataset');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className="card dataset-manager">
      <div className="card-header">
        <h3>Datasets</h3>
        <span className="dataset-count">{datasets.length}</span>
      </div>
      <div className="card-body">
        <div className="dataset-list">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="dataset-item">
              <div className="dataset-info">
                {editingId === dataset.id ? (
                  <input
                    type="text"
                    className="dataset-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(dataset.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="dataset-name">{dataset.name}</span>
                )}
                <span className="dataset-meta">
                  {dataset.month} {dataset.year} &bull; {dataset.recordCount.toLocaleString()} records
                </span>
                <span className="dataset-date">Uploaded {formatDate(dataset.uploadDate)}</span>
              </div>
              <div className="dataset-actions">
                {editingId === dataset.id ? (
                  <>
                    <button
                      className="btn-icon btn-save"
                      onClick={() => saveEdit(dataset.id)}
                      disabled={isLoading}
                      title="Save"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </button>
                    <button
                      className="btn-icon btn-cancel"
                      onClick={cancelEditing}
                      disabled={isLoading}
                      title="Cancel"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => startEditing(dataset)}
                      disabled={isLoading}
                      title="Rename"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(dataset.id, dataset.name)}
                      disabled={isLoading}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
