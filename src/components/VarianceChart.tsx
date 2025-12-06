import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { VarianceRecord } from '../types/variance';
import { formatCurrency } from '../utils/commentaryGenerator';

interface VarianceChartProps {
  data: VarianceRecord[];
}

// Minimum absolute value threshold to include in chart
const MIN_THRESHOLD = 5;

// Color palette for variance types
const VARIANCE_TYPE_COLORS: Record<string, string> = {
  'Promo Additions/Removals': '#3b82f6',
  'Promotion Additions': '#60a5fa',
  'Promotion Removals': '#2563eb',
  'Promo Changes': '#1d4ed8',
  'Favorable Under Performance': '#10b981',
  'Favorable No Performance': '#34d399',
  'Under Accrued Variance': '#f59e0b',
  'Non-Accrued Variance': '#ef4444',
};

// Get color for a variance type
function getVarianceTypeColor(varianceType: string): string {
  return VARIANCE_TYPE_COLORS[varianceType] || '#94a3b8';
}

// Short labels for variance types (for legend)
const VARIANCE_TYPE_SHORT_LABELS: Record<string, string> = {
  'Promo Additions/Removals': 'Add/Remove',
  'Promotion Additions': 'Additions',
  'Promotion Removals': 'Removals',
  'Promo Changes': 'Changes',
  'Favorable Under Performance': 'Fav Under',
  'Favorable No Performance': 'Fav No Perf',
  'Under Accrued Variance': 'Under Accrued',
  'Non-Accrued Variance': 'Non-Accrued',
};

function getShortLabel(varianceType: string): string {
  return VARIANCE_TYPE_SHORT_LABELS[varianceType] || varianceType;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out zero values
  const nonZeroPayload = payload.filter(entry => entry.value !== 0);
  if (nonZeroPayload.length === 0) return null;

  const total = nonZeroPayload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <div className="chart-tooltip-items">
        {nonZeroPayload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span
              className="chart-tooltip-color"
              style={{ backgroundColor: entry.color }}
            />
            <span className="chart-tooltip-name">{getShortLabel(entry.dataKey)}:</span>
            <span className="chart-tooltip-value">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
      <div className="chart-tooltip-total">
        <span>Total:</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export function VarianceChart({ data }: VarianceChartProps) {
  // Transform data for stacked bar chart
  // X-axis: Promotion Types, Stacks: Variance Types
  const { chartData, varianceTypes } = useMemo(() => {
    // Filter out records below threshold
    const filteredData = data.filter(
      record => Math.abs(record.sumOfVariance) >= MIN_THRESHOLD
    );

    // Group by promotion type and variance type
    const grouped = new Map<string, Map<string, number>>();
    const allVarianceTypes = new Set<string>();

    for (const record of filteredData) {
      const promoType = record.promotionType || 'Other';
      const varianceType = record.varianceType;

      if (!grouped.has(promoType)) {
        grouped.set(promoType, new Map());
      }

      const varMap = grouped.get(promoType)!;
      varMap.set(varianceType, (varMap.get(varianceType) || 0) + record.sumOfVariance);
      allVarianceTypes.add(varianceType);
    }

    // Convert to chart data format
    const chartData: Array<Record<string, string | number>> = [];

    for (const [promoType, varMap] of grouped) {
      const row: Record<string, string | number> = {
        promotionType: promoType,
      };

      for (const [varianceType, value] of varMap) {
        row[varianceType] = value;
      }

      chartData.push(row);
    }

    // Sort by total absolute variance
    const sortedVarianceTypes = Array.from(allVarianceTypes);
    chartData.sort((a, b) => {
      const totalA = sortedVarianceTypes.reduce(
        (sum, vt) => sum + Math.abs((a[vt] as number) || 0),
        0
      );
      const totalB = sortedVarianceTypes.reduce(
        (sum, vt) => sum + Math.abs((b[vt] as number) || 0),
        0
      );
      return totalB - totalA;
    });

    return {
      chartData,
      varianceTypes: sortedVarianceTypes.sort(),
    };
  }, [data]);

  if (data.length === 0 || chartData.length === 0) {
    return null;
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <h3>Variance by Promotion Type</h3>
      </div>
      <div className="card-body chart-body">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="promotionType"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-25}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value) => formatCurrency(value)}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
              formatter={(value) => getShortLabel(value)}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            {varianceTypes.map((varianceType) => (
              <Bar
                key={varianceType}
                dataKey={varianceType}
                stackId="stack"
                fill={getVarianceTypeColor(varianceType)}
                name={varianceType}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
