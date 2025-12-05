import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { VarianceRecord } from '../types/variance';

// Map Excel column names (trimmed) to our normalized names
const COLUMN_MAP: Record<string, string> = {
  'Variance Type': 'varianceType',
  'Customer': 'customer',
  'Line Key': 'lineKey',
  'Promotion Type': 'promotionType',
  'Product Group': 'productGroup',
  'Promotion Name': 'promotionName',
  'LBE2 Expected Spend': 'lbe2ExpectedSpend',
  'Throughput': 'throughput',
  'Variance': 'variance',
  'Include': 'include',
  'Account': 'account',
  'MEC Customer': 'mecCustomer',
  'Sales Rep': 'salesRep',
  'Channel': 'channel',
  'First Receiver': 'firstReceiver',
  'Period Month': 'periodMonth',
  'Period Year': 'periodYear',
};

// Normalize row keys by trimming whitespace
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim()] = value;
  }
  return normalized;
}

// Parse a row into a VarianceRecord
function parseRow(row: Record<string, unknown>): VarianceRecord {
  const normalizedRow = normalizeRow(row);

  const record: VarianceRecord = {
    varianceType: '',
    customer: '',
    promotionName: '',
    sumOfVariance: 0,
  };

  for (const [excelCol, normalizedCol] of Object.entries(COLUMN_MAP)) {
    const value = normalizedRow[excelCol];

    if (value === undefined || value === null) continue;

    if (normalizedCol === 'variance') {
      record.sumOfVariance = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } else if (normalizedCol === 'lbe2ExpectedSpend') {
      record.lbe2ExpectedSpend = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } else if (normalizedCol === 'throughput') {
      record.throughput = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } else if (normalizedCol === 'include') {
      record.include = value === true || value === 'true' || value === 'TRUE' || value === 1;
    } else {
      record[normalizedCol] = String(value);
    }
  }

  return record;
}

export async function parseFile(file: File): Promise<VarianceRecord[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

async function parseCSV(file: File): Promise<VarianceRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records = (results.data as Record<string, unknown>[]).map((row) =>
            parseRow(row)
          );
          resolve(records.filter((r) => r.varianceType || r.customer));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

async function parseExcel(file: File): Promise<VarianceRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Look for "Variance Engine" sheet, fall back to first sheet
        let sheetName = workbook.SheetNames[0];
        if (workbook.SheetNames.includes('Variance Engine')) {
          sheetName = 'Variance Engine';
        }
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON - start from row 2 as headers (range: 1)
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range: 1 });

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        const records = jsonData.map((row) => parseRow(row));

        // Filter out empty rows
        resolve(records.filter((r) => r.varianceType || r.customer));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
