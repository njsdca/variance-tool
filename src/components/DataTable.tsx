import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { VarianceRecord } from '../types/variance';
import { formatCurrency } from '../utils/commentaryGenerator';

// Generate Vividly portal URL from line key
function getVividlyUrl(lineKey: string): string {
  // Strip the last segment after the final hyphen (e.g., "2408-QCZQR-2" -> "2408-QCZQR")
  const parts = lineKey.split('-');
  if (parts.length > 2) {
    parts.pop();
  }
  const promotionId = parts.join('-');
  return `https://portal.govividly.com/planning-next/columns/${promotionId}`;
}

// Cell renderer for Line Key with link
function LineKeyCellRenderer(params: ICellRendererParams<VarianceRecord>) {
  const lineKey = params.value;
  if (!lineKey) return null;

  const url = getVividlyUrl(lineKey);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="line-key-link"
      onClick={(e) => e.stopPropagation()}
    >
      {lineKey}
    </a>
  );
}

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataTableProps {
  data: VarianceRecord[];
}

export function DataTable({ data }: DataTableProps) {
  const gridRef = useRef<AgGridReact<VarianceRecord>>(null);


  const columnDefs = useMemo<ColDef<VarianceRecord>[]>(
    () => [
      {
        field: 'varianceType',
        headerName: 'Variance Type',
        width: 200,
        filter: 'agSetColumnFilter',
      },
      {
        field: 'customer',
        headerName: 'Customer',
        width: 150,
        filter: 'agSetColumnFilter',
      },
      {
        field: 'lineKey',
        headerName: 'Line Key',
        width: 140,
        filter: 'agTextColumnFilter',
        cellRenderer: LineKeyCellRenderer,
      },
      {
        field: 'promotionType',
        headerName: 'Promotion Type',
        width: 130,
        filter: 'agSetColumnFilter',
      },
      {
        field: 'productGroup',
        headerName: 'Product Group',
        width: 160,
        filter: 'agSetColumnFilter',
      },
      {
        field: 'promotionName',
        headerName: 'Promotion Name',
        flex: 1,
        minWidth: 250,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'throughput',
        headerName: 'Actual Spend',
        width: 130,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return formatCurrency(params.value);
        },
        cellStyle: {
          justifyContent: 'flex-end',
        },
      },
      {
        field: 'lbe2ExpectedSpend',
        headerName: 'Expected Spend',
        width: 130,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return formatCurrency(params.value);
        },
        cellStyle: {
          justifyContent: 'flex-end',
        },
      },
      {
        field: 'sumOfVariance',
        headerName: 'Variance',
        width: 120,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return formatCurrency(params.value);
        },
        cellStyle: (params) => ({
          justifyContent: 'flex-end',
          fontWeight: 600,
          color: params.value >= 0 ? 'var(--success)' : 'var(--brand-primary)',
        }),
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
    }),
    []
  );

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <p className="empty-state-text">No data to display. Upload a variance file to get started.</p>
      </div>
    );
  }

  return (
    <div className="data-table-container ag-theme-alpine">
      <AgGridReact<VarianceRecord>
        ref={gridRef}
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        animateRows={true}
        enableCellTextSelection={true}
      />
    </div>
  );
}
