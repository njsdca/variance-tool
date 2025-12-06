import { useState, useCallback, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { FilterPanel } from './components/FilterPanel';
import { DataTable } from './components/DataTable';
import { TotalsCards } from './components/TotalsCards';
import { CommentaryPanel } from './components/CommentaryPanel';
import { DatasetManager } from './components/DatasetManager';
import { SaveModal } from './components/SaveModal';
import { parseFile } from './utils/fileParser';
import { saveMonthlyData, getAllRecordsCombined } from './db/database';
import type { VarianceRecord, Filters } from './types/variance';
import './index.css';

type Period = { month: string; year: number; label: string };

function App() {
  const [allData, setAllData] = useState<VarianceRecord[]>([]);
  const [filters, setFilters] = useState<Filters>({ account: '', mecCustomer: '', salesRep: '', period: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; records: VarianceRecord[] } | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<Period[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { records, periods } = await getAllRecordsCombined();
      setAllData(records);
      setAvailablePeriods(periods);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return allData.filter((record) => {
      if (filters.account && record.account !== filters.account) return false;
      if (filters.mecCustomer && record.mecCustomer !== filters.mecCustomer) return false;
      if (filters.salesRep && record.salesRep !== filters.salesRep) return false;
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

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const records = await parseFile(file);
      setPendingFile({ file, records });
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format and try again.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <img src="/Chomps.webp" alt="Chomps" className="header-logo" />
          <span className="header-title">Variance Tool</span>
        </div>
        <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
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

          {/* Data Table */}
          <div className="card table-card">
            <div className="card-header">
              <h2>Variance Data</h2>
            </div>
            <div className="card-body">
              <DataTable data={tableData} />
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

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing file...</p>
        </div>
      )}
    </div>
  );
}

export default App;
