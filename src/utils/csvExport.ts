import type { VarianceRecord } from '../types/variance';

// Column headers for CSV export
const CSV_COLUMNS = [
  { key: 'varianceType', header: 'Variance Type' },
  { key: 'customer', header: 'Customer' },
  { key: 'lineKey', header: 'Line Key' },
  { key: 'promotionType', header: 'Promotion Type' },
  { key: 'productGroup', header: 'Product Group' },
  { key: 'promotionName', header: 'Promotion Name' },
  { key: 'throughput', header: 'Actual Spend' },
  { key: 'lbe2ExpectedSpend', header: 'Expected Spend' },
  { key: 'sumOfVariance', header: 'Variance' },
  { key: 'account', header: 'Account' },
  { key: 'mecCustomer', header: 'MEC Customer' },
  { key: 'salesRep', header: 'Sales Rep' },
  { key: 'periodMonth', header: 'Period Month' },
  { key: 'periodYear', header: 'Period Year' },
];

function escapeCSVValue(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(data: VarianceRecord[], filename: string): void {
  // Create header row
  const headers = CSV_COLUMNS.map((col) => col.header).join(',');

  // Create data rows
  const rows = data.map((record) =>
    CSV_COLUMNS.map((col) => escapeCSVValue(record[col.key])).join(',')
  );

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
