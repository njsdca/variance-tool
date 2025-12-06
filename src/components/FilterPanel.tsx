import { useMemo } from 'react';
import type { VarianceRecord, Filters } from '../types/variance';

type Period = { month: string; year: number; label: string };

interface FilterPanelProps {
  data: VarianceRecord[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  availablePeriods?: Period[];
}

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel: string;
}

function MultiSelectFilter({ label, options, selected, onChange, allLabel }: MultiSelectFilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    onChange(selectedOptions);
  };

  const handleClear = () => {
    onChange([]);
  };

  const displayValue = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="filter-group">
      <label className="filter-label">{label}</label>
      <div className="filter-input-wrapper">
        <select
          className="filter-select"
          multiple
          value={selected}
          onChange={handleChange}
          size={1}
          title={selected.length > 0 ? selected.join(', ') : allLabel}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="filter-display" title={selected.length > 0 ? selected.join(', ') : undefined}>
          {displayValue}
        </div>
        {selected.length > 0 && (
          <button
            className="filter-clear-btn"
            onClick={handleClear}
            title="Clear filter"
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterPanel({ data, filters, onFilterChange, availablePeriods = [] }: FilterPanelProps) {
  // Get unique values for each filter field
  const filterOptions = useMemo(() => {
    const accounts = new Set<string>();
    const mecCustomers = new Set<string>();
    const salesReps = new Set<string>();
    const customers = new Set<string>();
    const varianceTypes = new Set<string>();
    const promotionTypes = new Set<string>();

    data.forEach((row) => {
      if (row.account) accounts.add(String(row.account));
      if (row.mecCustomer) mecCustomers.add(String(row.mecCustomer));
      if (row.salesRep) salesReps.add(String(row.salesRep));
      if (row.customer) customers.add(String(row.customer));
      if (row.varianceType) varianceTypes.add(String(row.varianceType));
      if (row.promotionType) promotionTypes.add(String(row.promotionType));
    });

    return {
      accounts: [...accounts].sort(),
      mecCustomers: [...mecCustomers].sort(),
      salesReps: [...salesReps].sort(),
      customers: [...customers].sort(),
      varianceTypes: [...varianceTypes].sort(),
      promotionTypes: [...promotionTypes].sort(),
    };
  }, [data]);

  const handleMultiChange = (field: keyof Omit<Filters, 'period'>, values: string[]) => {
    onFilterChange({
      ...filters,
      [field]: values,
    });
  };

  const handlePeriodChange = (value: string) => {
    onFilterChange({
      ...filters,
      period: value,
    });
  };

  const handleClearPeriod = () => {
    onFilterChange({
      ...filters,
      period: '',
    });
  };

  const handleClearAll = () => {
    onFilterChange({
      account: [],
      mecCustomer: [],
      salesRep: [],
      customer: [],
      varianceType: [],
      promotionType: [],
      period: '',
    });
  };

  const hasActiveFilters =
    filters.account.length > 0 ||
    filters.mecCustomer.length > 0 ||
    filters.salesRep.length > 0 ||
    filters.customer.length > 0 ||
    filters.varianceType.length > 0 ||
    filters.promotionType.length > 0 ||
    filters.period !== '';

  return (
    <div className="filter-panel">
      {availablePeriods.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Period</label>
          <div className="filter-input-wrapper">
            <select
              className="filter-select filter-select-single"
              value={filters.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
            >
              <option value="">All Periods</option>
              {availablePeriods.map((period) => (
                <option key={period.label} value={period.label}>
                  {period.label}
                </option>
              ))}
            </select>
            {filters.period && (
              <button
                className="filter-clear-btn"
                onClick={handleClearPeriod}
                title="Clear filter"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <MultiSelectFilter
        label="Variance Type"
        options={filterOptions.varianceTypes}
        selected={filters.varianceType}
        onChange={(v) => handleMultiChange('varianceType', v)}
        allLabel="All Variance Types"
      />

      <MultiSelectFilter
        label="Promotion Type"
        options={filterOptions.promotionTypes}
        selected={filters.promotionType}
        onChange={(v) => handleMultiChange('promotionType', v)}
        allLabel="All Promotion Types"
      />

      <MultiSelectFilter
        label="Customer"
        options={filterOptions.customers}
        selected={filters.customer}
        onChange={(v) => handleMultiChange('customer', v)}
        allLabel="All Customers"
      />

      <MultiSelectFilter
        label="Account"
        options={filterOptions.accounts}
        selected={filters.account}
        onChange={(v) => handleMultiChange('account', v)}
        allLabel="All Accounts"
      />

      <MultiSelectFilter
        label="MEC Customer"
        options={filterOptions.mecCustomers}
        selected={filters.mecCustomer}
        onChange={(v) => handleMultiChange('mecCustomer', v)}
        allLabel="All MEC Customers"
      />

      <MultiSelectFilter
        label="Sales Rep"
        options={filterOptions.salesReps}
        selected={filters.salesRep}
        onChange={(v) => handleMultiChange('salesRep', v)}
        allLabel="All Sales Reps"
      />

      {hasActiveFilters && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClearAll}
        >
          Clear All
        </button>
      )}
    </div>
  );
}
