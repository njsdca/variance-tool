import { useState } from 'react';

interface SaveModalProps {
  fileName: string;
  recordCount: number;
  onSave: (name: string, month: string, year: number) => Promise<void>;
  onCancel: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SaveModal({ fileName, recordCount, onSave, onCancel }: SaveModalProps) {
  const currentDate = new Date();
  const [name, setName] = useState(fileName.replace(/\.(csv|xlsx|xls)$/i, ''));
  const [month, setMonth] = useState(MONTHS[currentDate.getMonth()]);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(name, month, year);
    } catch (error) {
      console.error('Error saving:', error);
      setIsSaving(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save Variance Data</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="record-info">{recordCount.toLocaleString()} records parsed</p>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Month</label>
                <select
                  className="form-control"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={isSaving}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select
                  className="form-control"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  disabled={isSaving}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
