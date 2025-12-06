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

// Color palette for promotion types
const PROMO_TYPE_COLORS: Record<string, string> = {
  'Display': '#3b82f6',
  'TPR': '#8b5cf6',
  'EDLP': '#06b6d4',
  'Scan': '#f59e0b',
  'Billback': '#10b981',
  'Lump Sum': '#ec4899',
  'Spoils': '#6366f1',
  'Off Invoice': '#14b8a6',
  'Other': '#94a3b8',
};

// Get color for a promotion type
function getPromoTypeColor(promoType: string): string {
  return PROMO_TYPE_COLORS[promoType] || PROMO_TYPE_COLORS['Other'];
}

// Short labels for variance types
const VARIANCE_TYPE_SHORT_LABELS: Record<string, string> = {
  'Promo Additions/Removals': 'Additions/Removals',
  'Promotion Additions': 'Additions',
  'Promotion Removals': 'Removals',
  'Promo Changes': 'Changes',
  'Favorable Under Performance': 'Favorable Under',
  'Favorable No Performance': 'Favorable No Perf',
  'Under Accrued Variance': 'Under Accrued',
  'Non-Accrued Variance': 'Non-Accrued',
};

function getShortLabel(varianceType: string): string {
  return VARIANCE_TYPE_SHORT_LABELS[varianceType] || varianceType;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <div className="chart-tooltip-items">
        {payload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span
              className="chart-tooltip-color"
              style={{ backgroundColor: entry.color }}
            />
            <span className="chart-tooltip-name">{entry.name}:</span>
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
  const { chartData, promoTypes } = useMemo(() => {
    // Group by variance type and promotion type
    const grouped = new Map<string, Map<string, number>>();
    const allPromoTypes = new Set<string>();

    for (const record of data) {
      const varianceType = record.varianceType;
      const promoType = record.promotionType || 'Other';

      if (!grouped.has(varianceType)) {
        grouped.set(varianceType, new Map());
      }

      const promoMap = grouped.get(varianceType)!;
      promoMap.set(promoType, (promoMap.get(promoType) || 0) + record.sumOfVariance);
      allPromoTypes.add(promoType);
    }

    // Convert to chart data format
    const chartData: Array<Record<string, string | number>> = [];

    for (const [varianceType, promoMap] of grouped) {
      const row: Record<string, string | number> = {
        varianceType: getShortLabel(varianceType),
        fullName: varianceType,
      };

      for (const [promoType, value] of promoMap) {
        row[promoType] = value;
      }

      chartData.push(row);
    }

    // Sort by total absolute variance
    chartData.sort((a, b) => {
      const totalA = Array.from(allPromoTypes).reduce(
        (sum, pt) => sum + Math.abs((a[pt] as number) || 0),
        0
      );
      const totalB = Array.from(allPromoTypes).reduce(
        (sum, pt) => sum + Math.abs((b[pt] as number) || 0),
        0
      );
      return totalB - totalA;
    });

    return {
      chartData,
      promoTypes: Array.from(allPromoTypes).sort(),
    };
  }, [data]);

  if (data.length === 0 || chartData.length === 0) {
    return null;
  }

  return (
    <div className="card chart-card">
      <div className="card-header">
        <h3>Variance by Type</h3>
      </div>
      <div className="card-body chart-body">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="varianceType"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-35}
              textAnchor="end"
              height={70}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value) => formatCurrency(value)}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
            {promoTypes.map((promoType) => (
              <Bar
                key={promoType}
                dataKey={promoType}
                stackId="stack"
                fill={getPromoTypeColor(promoType)}
                name={promoType}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
