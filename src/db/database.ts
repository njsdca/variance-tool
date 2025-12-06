import { createClient } from '@supabase/supabase-js';
import type { MonthlyData, VarianceRecord } from '../types/variance';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Convert snake_case DB record to camelCase
function toVarianceRecord(dbRecord: Record<string, unknown>): VarianceRecord {
  return {
    varianceType: dbRecord.variance_type as string || '',
    customer: dbRecord.customer as string || '',
    lineKey: dbRecord.line_key as string,
    promotionType: dbRecord.promotion_type as string,
    productGroup: dbRecord.product_group as string,
    promotionName: dbRecord.promotion_name as string || '',
    lbe2ExpectedSpend: dbRecord.lbe2_expected_spend as number,
    throughput: dbRecord.throughput as number,
    sumOfVariance: dbRecord.sum_of_variance as number || 0,
    include: dbRecord.include as boolean,
    account: dbRecord.account as string,
    mecCustomer: dbRecord.mec_customer as string,
    salesRep: dbRecord.sales_rep as string,
    channel: dbRecord.channel as string,
    firstReceiver: dbRecord.first_receiver as string,
  };
}

// Convert camelCase record to snake_case for DB
function toDbRecord(record: VarianceRecord, monthlyDataId: number) {
  return {
    monthly_data_id: monthlyDataId,
    variance_type: record.varianceType,
    customer: record.customer,
    line_key: record.lineKey,
    promotion_type: record.promotionType,
    product_group: record.productGroup,
    promotion_name: record.promotionName,
    lbe2_expected_spend: record.lbe2ExpectedSpend,
    throughput: record.throughput,
    sum_of_variance: record.sumOfVariance,
    include: record.include,
    account: record.account,
    mec_customer: record.mecCustomer,
    sales_rep: record.salesRep,
    channel: record.channel,
    first_receiver: record.firstReceiver,
  };
}

export async function saveMonthlyData(data: Omit<MonthlyData, 'id'>): Promise<number> {
  console.log(`Saving monthly data: ${data.name}, ${data.records.length} records`);

  // Insert monthly data record
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('monthly_data')
    .insert({
      name: data.name,
      month: data.month,
      year: data.year,
      upload_date: data.uploadDate.toISOString(),
    })
    .select('id')
    .single();

  if (monthlyError) {
    console.error('Error saving monthly data:', monthlyError);
    throw monthlyError;
  }

  const monthlyDataId = monthlyData.id;
  console.log(`Created monthly_data with id: ${monthlyDataId}`);

  // Insert all variance records in batches
  const batchSize = 500;
  let totalInserted = 0;

  for (let i = 0; i < data.records.length; i += batchSize) {
    const batch = data.records.slice(i, i + batchSize);
    const dbRecords = batch.map((record) => toDbRecord(record, monthlyDataId));

    const { error: recordsError, count } = await supabase
      .from('variance_records')
      .insert(dbRecords);

    if (recordsError) {
      console.error(`Error saving variance records batch ${i / batchSize + 1}:`, recordsError);
      throw recordsError;
    }

    totalInserted += batch.length;
    console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} records (total: ${totalInserted})`);
  }

  console.log(`Finished saving ${totalInserted} variance records`);
  return monthlyDataId;
}

export async function getAllMonthlyData(): Promise<MonthlyData[]> {
  const { data: monthlyDataList, error } = await supabase
    .from('monthly_data')
    .select('*')
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching monthly data:', error);
    return [];
  }

  // Fetch records for each monthly data
  const results: MonthlyData[] = [];
  for (const md of monthlyDataList) {
    // Fetch all records with pagination (Supabase default limit is 1000)
    const allRecords: Record<string, unknown>[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: records, error: fetchError } = await supabase
        .from('variance_records')
        .select('*')
        .eq('monthly_data_id', md.id)
        .range(from, from + pageSize - 1);

      if (fetchError) {
        console.error('Error fetching variance records:', fetchError);
        break;
      }

      if (!records || records.length === 0) break;
      allRecords.push(...records);
      if (records.length < pageSize) break;
      from += pageSize;
    }

    results.push({
      id: md.id,
      name: md.name,
      month: md.month,
      year: md.year,
      uploadDate: new Date(md.upload_date),
      records: allRecords.map(toVarianceRecord),
    });
  }

  return results;
}

export async function getMonthlyDataById(id: number): Promise<MonthlyData | undefined> {
  const { data: md, error } = await supabase
    .from('monthly_data')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !md) {
    return undefined;
  }

  // Fetch all records with pagination
  const allRecords: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data: records, error: fetchError } = await supabase
      .from('variance_records')
      .select('*')
      .eq('monthly_data_id', id)
      .range(from, from + pageSize - 1);

    if (fetchError) {
      console.error('Error fetching variance records:', fetchError);
      break;
    }

    if (!records || records.length === 0) break;
    allRecords.push(...records);
    if (records.length < pageSize) break;
    from += pageSize;
  }

  return {
    id: md.id,
    name: md.name,
    month: md.month,
    year: md.year,
    uploadDate: new Date(md.upload_date),
    records: allRecords.map(toVarianceRecord),
  };
}

export async function deleteMonthlyData(id: number): Promise<void> {
  const { error } = await supabase
    .from('monthly_data')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting monthly data:', error);
    throw error;
  }
}

export async function getAllRecordsCombined(): Promise<{
  records: VarianceRecord[];
  periods: { month: string; year: number; label: string }[];
}> {
  // Get all monthly data
  const { data: monthlyDataList, error: mdError } = await supabase
    .from('monthly_data')
    .select('*')
    .order('upload_date', { ascending: false });

  if (mdError || !monthlyDataList) {
    console.error('Error fetching monthly data:', mdError);
    return { records: [], periods: [] };
  }

  const records: VarianceRecord[] = [];
  const periodsSet = new Map<string, { month: string; year: number }>();

  for (const md of monthlyDataList) {
    const periodKey = `${md.month}-${md.year}`;

    if (!periodsSet.has(periodKey)) {
      periodsSet.set(periodKey, { month: md.month, year: md.year });
    }

    // Fetch all records with pagination (Supabase default limit is 1000)
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: varRecords, error: fetchError } = await supabase
        .from('variance_records')
        .select('*')
        .eq('monthly_data_id', md.id)
        .range(from, from + pageSize - 1);

      if (fetchError) {
        console.error('Error fetching variance records:', fetchError);
        break;
      }

      if (!varRecords || varRecords.length === 0) break;

      for (const record of varRecords) {
        const varRecord = toVarianceRecord(record);
        varRecord.periodMonth = md.month;
        varRecord.periodYear = String(md.year);
        records.push(varRecord);
      }

      if (varRecords.length < pageSize) break;
      from += pageSize;
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
