interface ExportModalProps {
  currentViewCount: number;
  allDataCount: number;
  onExport: (type: 'current' | 'all') => void;
  onCancel: () => void;
}

export function ExportModal({
  currentViewCount,
  allDataCount,
  onExport,
  onCancel,
}: ExportModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export to CSV</h3>
        </div>
        <div className="modal-body">
          <p className="export-description">
            Choose which data to export:
          </p>
          <div className="export-options">
            <button
              className="export-option"
              onClick={() => onExport('current')}
            >
              <span className="export-option-title">Current View</span>
              <span className="export-option-count">
                {currentViewCount.toLocaleString()} records
              </span>
              <span className="export-option-desc">
                Export only the filtered data currently displayed
              </span>
            </button>
            <button
              className="export-option"
              onClick={() => onExport('all')}
            >
              <span className="export-option-title">All Data</span>
              <span className="export-option-count">
                {allDataCount.toLocaleString()} records
              </span>
              <span className="export-option-desc">
                Export all included records across all filters
              </span>
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
