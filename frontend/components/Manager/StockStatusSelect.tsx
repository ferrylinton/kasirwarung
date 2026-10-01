import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

export type StockFilterType = 'all' | 'available' | 'low' | 'empty';

export interface StockCounts {
  all: number;
  available: number;
  low: number;
  empty: number;
}

export interface StockStatusSelectProps {
  value: StockFilterType;
  onChange: (value: StockFilterType) => void;
  stockCounts?: StockCounts;
  className?: string;
  ariaLabel?: string;
}

export const StockStatusSelect: React.FC<StockStatusSelectProps> = ({
  value,
  onChange,
  stockCounts = { all: 0, available: 0, low: 0, empty: 0 },
  className = '',
  ariaLabel = 'Filter Status Stok',
}) => {
  const options: {
    value: StockFilterType;
    label: string;
    color: string;
    count: number;
  }[] = [
    { value: 'all', label: 'Semua Status Stok', color: 'bg-theme-primary', count: stockCounts.all },
    { value: 'available', label: 'Stok Aman', color: 'bg-emerald-500', count: stockCounts.available },
    { value: 'low', label: 'Menipis (≤ Batas)', color: 'bg-amber-500', count: stockCounts.low },
    { value: 'empty', label: 'Habis (0)', color: 'bg-rose-500', count: stockCounts.empty },
  ];

  const currentOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={className}>
      <Select.Root
        value={value}
        onValueChange={(val) => onChange(val as StockFilterType)}
      >
        <Select.Trigger
          className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer outline-hidden focus:ring-2 focus:ring-theme-primary/20 min-w-[170px]"
          aria-label={ariaLabel}
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                value === 'available'
                  ? 'bg-emerald-500'
                  : value === 'low'
                  ? 'bg-amber-500 animate-pulse'
                  : value === 'empty'
                  ? 'bg-rose-500'
                  : 'bg-theme-primary'
              }`}
            />
            <Select.Value>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {value === 'available'
                  ? 'Stok Aman'
                  : value === 'low'
                  ? 'Menipis'
                  : value === 'empty'
                  ? 'Habis'
                  : 'Semua Status Stok'}
              </span>
            </Select.Value>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {currentOption.count}
            </span>
            <Select.Icon className="text-slate-400 dark:text-slate-500">
              <ChevronDown className="w-3.5 h-3.5" />
            </Select.Icon>
          </div>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 min-w-[210px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 animate-in fade-in-80 zoom-in-95"
            position="popper"
            sideOffset={6}
          >
            <Select.ScrollUpButton className="flex items-center justify-center py-1 text-slate-400 cursor-pointer">
              <ChevronUp className="w-4 h-4" />
            </Select.ScrollUpButton>

            <Select.Viewport className="p-1">
              {options.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                >
                  <Select.ItemText>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </span>
                    </div>
                  </Select.ItemText>

                  <div className="flex items-center gap-2 pl-3">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                      {item.count}
                    </span>
                    <Select.ItemIndicator className="text-theme-primary">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </div>
                </Select.Item>
              ))}
            </Select.Viewport>

            <Select.ScrollDownButton className="flex items-center justify-center py-1 text-slate-400 cursor-pointer">
              <ChevronDown className="w-4 h-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

export default StockStatusSelect;
