import { useState, useCallback, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { FilterPanel } from './components/FilterPanel';
import { DataTable } from './components/DataTable';
import { TotalsCards } from './components/TotalsCards';
import { CommentaryPanel } from './components/CommentaryPanel';
import { DatasetManager } from './components/DatasetManager';
import { SaveModal } from './components/SaveModal';
import { ExportModal } from './components/ExportModal';
import { VarianceChart } from './components/VarianceChart';
import { parseFile } from './utils/fileParser';
import { saveMonthlyData, getAllRecordsCombined } from './db/database';
import { exportToCSV } from './utils/csvExport';
import type { VarianceRecord, Filters } from './types/variance';
import './index.css';

type Period = { month: string; year: number; label: string };

function App() {
  const [allData, setAllData] = useState<VarianceRecord[]>([]);
  const [filters, setFilters] = useState<Filters>({
    account: [],
    mecCustomer: [],
    salesRep: [],
    customer: [],
    varianceType: [],
    promotionType: [],
    period: '',
  });
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [pendingFile, setPendingFile] = useState<{ file: File; records: VarianceRecord[] } | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const { records, periods } = await getAllRecordsCombined();
      setAllData(records);
      setAvailablePeriods(periods);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return allData.filter((record) => {
      // Multi-select filters - if array is empty, show all; otherwise check if value is in array
      if (filters.account.length > 0 && !filters.account.includes(record.account || '')) return false;
      if (filters.mecCustomer.length > 0 && !filters.mecCustomer.includes(record.mecCustomer || '')) return false;
      if (filters.salesRep.length > 0 && !filters.salesRep.includes(record.salesRep || '')) return false;
      if (filters.customer.length > 0 && !filters.customer.includes(record.customer || '')) return false;
      if (filters.varianceType.length > 0 && !filters.varianceType.includes(record.varianceType || '')) return false;
      if (filters.promotionType.length > 0 && !filters.promotionType.includes(record.promotionType || '')) return false;

      // Single select period filter
      if (filters.period) {
        const recordPeriod = `${record.periodMonth} ${record.periodYear}`;
        if (recordPeriod !== filters.period) return false;
      }
      return true;
    });
  }, [allData, filters]);

  // Only show records with Include = true in the table
  const tableData = useMemo(() => {
    return filteredData.filter((record) => record.include === true);
  }, [filteredData]);

  // All included records (for export all option)
  const allIncludedData = useMemo(() => {
    return allData.filter((record) => record.include === true);
  }, [allData]);

  const handleFileSelect = useCallback((file: File) => {
    setIsParsingFile(true);
    // Use setTimeout to allow the loading overlay to render before blocking parse
    setTimeout(async () => {
      try {
        const records = await parseFile(file);
        setPendingFile({ file, records });
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format and try again.');
      } finally {
        setIsParsingFile(false);
      }
    }, 50);
  }, []);

  const handleSave = useCallback(async (name: string, month: string, year: number) => {
    if (!pendingFile) return;

    await saveMonthlyData({
      name,
      month,
      year,
      uploadDate: new Date(),
      records: pendingFile.records,
    });

    setPendingFile(null);
    // Reload all data to include the new upload
    await loadAllData();
    // Set filter to the newly uploaded period
    setFilters((f) => ({ ...f, period: `${month} ${year}` }));
    // Trigger dataset manager refresh
    setRefreshTrigger((t) => t + 1);
  }, [pendingFile, loadAllData]);

  const handleCancelSave = useCallback(() => {
    setPendingFile(null);
  }, []);

  const handleExport = useCallback((type: 'current' | 'all') => {
    const dataToExport = type === 'current' ? tableData : allIncludedData;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = type === 'current'
      ? `variance-data-filtered-${timestamp}.csv`
      : `variance-data-all-${timestamp}.csv`;
    exportToCSV(dataToExport, filename);
    setShowExportModal(false);
  }, [tableData, allIncludedData]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <img src="/Chomps.webp" alt="Chomps" className="header-logo" />
          <span className="header-title">Variance Tool</span>
        </div>
        <FileUpload onFileSelect={handleFileSelect} isLoading={isParsingFile} />
      </header>

      <main className="app-main">
        <div className="main-content">
          {/* Filter Panel */}
          {allData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>Filters</h3>
                <span className="record-count">
                  {tableData.length.toLocaleString()} of {allData.filter(r => r.include).length.toLocaleString()} included records
                </span>
              </div>
              <div className="card-body">
                <FilterPanel
                  data={allData}
                  filters={filters}
                  onFilterChange={setFilters}
                  availablePeriods={availablePeriods}
                />
              </div>
            </div>
          )}

          {/* Variance Chart */}
          {tableData.length > 0 && <VarianceChart data={tableData} />}

          {/* Data Table */}
          <div className="card table-card">
            <div className="card-header">
              <h2>Variance Data</h2>
              {tableData.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowExportModal(true)}
                >
                  Export CSV
                </button>
              )}
            </div>
            <div className="card-body">
              {isLoadingData ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading data...</p>
                </div>
              ) : (
                <DataTable data={tableData} />
              )}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <TotalsCards data={tableData} />
          <CommentaryPanel data={tableData} />
          <DatasetManager onDataChange={loadAllData} refreshTrigger={refreshTrigger} />
        </div>
      </main>

      {pendingFile && (
        <SaveModal
          fileName={pendingFile.file.name}
          recordCount={pendingFile.records.length}
          onSave={handleSave}
          onCancel={handleCancelSave}
        />
      )}

      {showExportModal && (
        <ExportModal
          currentViewCount={tableData.length}
          allDataCount={allIncludedData.length}
          onExport={handleExport}
          onCancel={() => setShowExportModal(false)}
        />
      )}

      {isParsingFile && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing file...</p>
        </div>
      )}
    </div>
  );
}

export default App;
