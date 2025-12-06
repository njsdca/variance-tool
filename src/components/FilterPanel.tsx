import { useMemo, useState, useRef, useEffect } from 'react';
import type { VarianceRecord, Filters } from '../types/variance';

type Period = { month: string; year: number; label: string };

interface FilterPanelProps {
  data: VarianceRecord[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  availablePeriods?: Period[];
}

interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel: string;
}

function SearchableMultiSelect({ label, options, selected, onChange, allLabel }: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(searchLower));
  }, [options, search]);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayValue = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="filter-group" ref={containerRef}>
      <label className="filter-label">{label}</label>
      <div className="filter-dropdown-wrapper">
        <button
          type="button"
          className="filter-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          title={selected.length > 0 ? selected.join(', ') : undefined}
        >
          <span className="filter-dropdown-value">{displayValue}</span>
          <span className="filter-dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
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
        {isOpen && (
          <div className="filter-dropdown-menu">
            <div className="filter-dropdown-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="filter-search-input"
              />
            </div>
            <div className="filter-dropdown-options">
              {options.length > 1 && (
                <label className="filter-dropdown-option filter-dropdown-select-all">
                  <input
                    type="checkbox"
                    checked={selected.length === options.length}
                    onChange={handleSelectAll}
                  />
                  <span>Select All ({options.length})</span>
                </label>
              )}
              {filteredOptions.length === 0 ? (
                <div className="filter-dropdown-empty">No matches found</div>
              ) : (
                filteredOptions.map((option) => (
                  <label key={option} className="filter-dropdown-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(option)}
                      onChange={() => handleToggle(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))
              )}
            </div>
          </div>
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
      periods: availablePeriods.map(p => p.label),
    };
  }, [data, availablePeriods]);

  const handleChange = (field: keyof Filters, values: string[]) => {
    onFilterChange({
      ...filters,
      [field]: values,
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
      period: [],
    });
  };

  const hasActiveFilters =
    filters.account.length > 0 ||
    filters.mecCustomer.length > 0 ||
    filters.salesRep.length > 0 ||
    filters.customer.length > 0 ||
    filters.varianceType.length > 0 ||
    filters.promotionType.length > 0 ||
    filters.period.length > 0;

  return (
    <div className="filter-panel">
      {availablePeriods.length > 0 && (
        <SearchableMultiSelect
          label="Period"
          options={filterOptions.periods}
          selected={filters.period}
          onChange={(v) => handleChange('period', v)}
          allLabel="All Periods"
        />
      )}

      <SearchableMultiSelect
        label="Variance Type"
        options={filterOptions.varianceTypes}
        selected={filters.varianceType}
        onChange={(v) => handleChange('varianceType', v)}
        allLabel="All Variance Types"
      />

      <SearchableMultiSelect
        label="Promotion Type"
        options={filterOptions.promotionTypes}
        selected={filters.promotionType}
        onChange={(v) => handleChange('promotionType', v)}
        allLabel="All Promotion Types"
      />

      <SearchableMultiSelect
        label="Customer"
        options={filterOptions.customers}
        selected={filters.customer}
        onChange={(v) => handleChange('customer', v)}
        allLabel="All Customers"
      />

      <SearchableMultiSelect
        label="Account"
        options={filterOptions.accounts}
        selected={filters.account}
        onChange={(v) => handleChange('account', v)}
        allLabel="All Accounts"
      />

      <SearchableMultiSelect
        label="MEC Customer"
        options={filterOptions.mecCustomers}
        selected={filters.mecCustomer}
        onChange={(v) => handleChange('mecCustomer', v)}
        allLabel="All MEC Customers"
      />

      <SearchableMultiSelect
        label="Sales Rep"
        options={filterOptions.salesReps}
        selected={filters.salesRep}
        onChange={(v) => handleChange('salesRep', v)}
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
