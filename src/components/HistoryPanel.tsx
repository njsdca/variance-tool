import { useState, useEffect } from 'react';
import type { MonthlyData } from '../types/variance';
import { getAllMonthlyData, deleteMonthlyData } from '../db/database';

interface HistoryPanelProps {
  currentId?: number | 'all';
  onSelect: (data: MonthlyData) => void;
  onSelectAll: () => void;
  refreshTrigger?: number;
}

export function HistoryPanel({ currentId, onSelect, onSelectAll, refreshTrigger }: HistoryPanelProps) {
  const [history, setHistory] = useState<MonthlyData[]>([]);

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  const loadHistory = async () => {
    const data = await getAllMonthlyData();
    setHistory(data);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Delete this saved data?')) {
      await deleteMonthlyData(id);
      loadHistory();
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (history.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>History</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-text">
              Uploaded files will be saved here for future reference.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>History</h3>
      </div>
      <div className="card-body" style={{ padding: '0.5rem' }}>
        {history.length > 1 && (
          <button
            className={`btn btn-view-all ${currentId === 'all' ? 'active' : ''}`}
            onClick={onSelectAll}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            View All Periods ({history.length})
          </button>
        )}
        <ul className="history-list">
          {history.map((item) => (
            <li
              key={item.id}
              className={`history-item ${currentId !== 'all' && item.id === currentId ? 'active' : ''}`}
              onClick={() => onSelect(item)}
            >
              <div className="history-item-info">
                <p className="history-item-name">{item.name}</p>
                <p className="history-item-date">
                  {item.month} {item.year} • {formatDate(item.uploadDate)}
                </p>
              </div>
              <div className="history-item-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => handleDelete(e, item.id!)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
