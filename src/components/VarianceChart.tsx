import { useMemo, useRef, useState } from 'react';
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
import html2canvas from 'html2canvas';
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
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });
      const link = document.createElement('a');
      link.download = `variance-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export chart:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy chart:', err);
    } finally {
      setExporting(false);
    }
  };

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

  // Calculate dynamic height based on number of bars
  const chartHeight = Math.max(380, Math.min(500, chartData.length * 35 + 150));

  return (
    <div className="card chart-card">
      <div className="card-header">
        <h3>Variance by Promotion Type</h3>
        <div className="chart-export-actions">
          {copied ? (
            <span className="chart-copied-msg">Copied!</span>
          ) : (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyToClipboard}
                disabled={exporting}
                title="Copy chart to clipboard for pasting into PowerPoint"
              >
                {exporting ? 'Copying...' : 'Copy to Clipboard'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportPNG}
                disabled={exporting}
                title="Download chart as PNG image"
              >
                {exporting ? 'Exporting...' : 'Export PNG'}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="card-body chart-body" ref={chartRef}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
            stackOffset="sign"
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="promotionType"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-40}
              textAnchor="end"
              height={90}
              interval={0}
              tickMargin={5}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value) => formatCurrency(value)}
              width={75}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
              formatter={(value) => getShortLabel(value)}
              iconType="square"
              iconSize={10}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
            {varianceTypes.map((varianceType) => (
              <Bar
                key={varianceType}
                dataKey={varianceType}
                stackId="stack"
                fill={getVarianceTypeColor(varianceType)}
                name={varianceType}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
