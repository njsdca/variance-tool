import Dexie, { type EntityTable } from 'dexie';
import type { MonthlyData } from '../types/variance';

const db = new Dexie('VarianceToolDB') as Dexie & {
  monthlyData: EntityTable<MonthlyData, 'id'>;
};

db.version(1).stores({
  monthlyData: '++id, name, month, year, uploadDate',
});

export { db };

export async function saveMonthlyData(data: Omit<MonthlyData, 'id'>): Promise<number> {
  const id = await db.monthlyData.add(data as MonthlyData);
  return id as number;
}

export async function getAllMonthlyData(): Promise<MonthlyData[]> {
  return await db.monthlyData.orderBy('uploadDate').reverse().toArray();
}

export async function getMonthlyDataById(id: number): Promise<MonthlyData | undefined> {
  return await db.monthlyData.get(id);
}

export async function deleteMonthlyData(id: number): Promise<void> {
  await db.monthlyData.delete(id);
}

export async function getAllRecordsCombined(): Promise<{
  records: import('../types/variance').VarianceRecord[];
  periods: { month: string; year: number; label: string }[];
}> {
  const allData = await db.monthlyData.orderBy('uploadDate').reverse().toArray();

  const records: import('../types/variance').VarianceRecord[] = [];
  const periodsSet = new Map<string, { month: string; year: number }>();

  for (const monthlyData of allData) {
    const periodKey = `${monthlyData.month}-${monthlyData.year}`;

    // Track unique periods
    if (!periodsSet.has(periodKey)) {
      periodsSet.set(periodKey, { month: monthlyData.month, year: monthlyData.year });
    }

    // Add records with period info
    for (const record of monthlyData.records) {
      records.push({
        ...record,
        periodMonth: monthlyData.month,
        periodYear: String(monthlyData.year),
      });
    }
  }

  // Sort periods chronologically
  const periods = Array.from(periodsSet.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return months.indexOf(b.month) - months.indexOf(a.month);
    })
    .map((p) => ({ ...p, label: `${p.month} ${p.year}` }));

  return { records, periods };
}
