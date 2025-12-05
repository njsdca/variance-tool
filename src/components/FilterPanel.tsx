import { useMemo } from 'react';
import type { VarianceRecord, Filters } from '../types/variance';

type Period = { month: string; year: number; label: string };

interface FilterPanelProps {
  data: VarianceRecord[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  availablePeriods?: Period[];
}

export function FilterPanel({ data, filters, onFilterChange, availablePeriods = [] }: FilterPanelProps) {
  // Get unique values for each filter field
  const filterOptions = useMemo(() => {
    const accounts = new Set<string>();
    const mecCustomers = new Set<string>();
    const salesReps = new Set<string>();

    data.forEach((row) => {
      if (row.account) accounts.add(String(row.account));
      if (row.mecCustomer) mecCustomers.add(String(row.mecCustomer));
      if (row.salesRep) salesReps.add(String(row.salesRep));
    });

    return {
      accounts: [...accounts].sort(),
      mecCustomers: [...mecCustomers].sort(),
      salesReps: [...salesReps].sort(),
    };
  }, [data]);

  const handleChange = (field: keyof typeof filters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="filter-panel">
      {availablePeriods.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Period</label>
          <select
            className="filter-select"
            value={filters.period}
            onChange={(e) => handleChange('period', e.target.value)}
          >
            <option value="">All Periods</option>
            {availablePeriods.map((period) => (
              <option key={period.label} value={period.label}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-group">
        <label className="filter-label">Account</label>
        <select
          className="filter-select"
          value={filters.account}
          onChange={(e) => handleChange('account', e.target.value)}
        >
          <option value="">All Accounts</option>
          {filterOptions.accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">MEC Customer</label>
        <select
          className="filter-select"
          value={filters.mecCustomer}
          onChange={(e) => handleChange('mecCustomer', e.target.value)}
        >
          <option value="">All MEC Customers</option>
          {filterOptions.mecCustomers.map((customer) => (
            <option key={customer} value={customer}>
              {customer}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Sales Rep</label>
        <select
          className="filter-select"
          value={filters.salesRep}
          onChange={(e) => handleChange('salesRep', e.target.value)}
        >
          <option value="">All Sales Reps</option>
          {filterOptions.salesReps.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </select>
      </div>

      {(filters.account || filters.mecCustomer || filters.salesRep || filters.period) && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onFilterChange({ account: '', mecCustomer: '', salesRep: '', period: '' })}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
