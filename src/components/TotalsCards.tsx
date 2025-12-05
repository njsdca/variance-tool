import { useMemo } from 'react';
import type { VarianceRecord } from '../types/variance';
import { formatCurrency } from '../utils/commentaryGenerator';

interface TotalsCardsProps {
  data: VarianceRecord[];
}

export function TotalsCards({ data }: TotalsCardsProps) {
  const totals = useMemo(() => {
    return data.reduce(
      (acc, record) => ({
        actualSpend: acc.actualSpend + (record.throughput || 0),
        expectedSpend: acc.expectedSpend + (record.lbe2ExpectedSpend || 0),
        variance: acc.variance + (record.sumOfVariance || 0),
      }),
      { actualSpend: 0, expectedSpend: 0, variance: 0 }
    );
  }, [data]);

  return (
    <div className="totals-cards">
      <div className="totals-card">
        <span className="totals-card-label">Actual Spend</span>
        <span className="totals-card-value">{formatCurrency(totals.actualSpend)}</span>
      </div>
      <div className="totals-card">
        <span className="totals-card-label">Expected Spend</span>
        <span className="totals-card-value">{formatCurrency(totals.expectedSpend)}</span>
      </div>
      <div className="totals-card">
        <span className="totals-card-label">Variance</span>
        <span className={`totals-card-value ${totals.variance >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(totals.variance)}
        </span>
      </div>
    </div>
  );
}
