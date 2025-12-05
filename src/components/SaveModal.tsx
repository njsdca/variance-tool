import { useState } from 'react';

interface SaveModalProps {
  fileName: string;
  onSave: (name: string, month: string, year: number) => void;
  onCancel: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SaveModal({ fileName, onSave, onCancel }: SaveModalProps) {
  const currentDate = new Date();
  const [name, setName] = useState(fileName.replace(/\.(csv|xlsx|xls)$/i, ''));
  const [month, setMonth] = useState(MONTHS[currentDate.getMonth()]);
  const [year, setYear] = useState(currentDate.getFullYear());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name, month, year);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Save Variance Data</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
