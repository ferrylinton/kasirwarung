import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check, Rows3 } from 'lucide-react';

export interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  labelSuffix?: string;
  className?: string;
  ariaLabel?: string;
}

export const PageSizeSelect: React.FC<PageSizeSelectProps> = ({
  value,
  onChange,
  options = [5, 10, 20, 50],
  labelSuffix = 'baris',
  className = '',
  ariaLabel = 'Pilih jumlah baris data per halaman',
}) => {
  return (
    <div className={className}>
      <Select.Root
        value={String(value)}
        onValueChange={(val) => onChange(Number(val))}
      >
        <Select.Trigger
          className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer outline-hidden focus:ring-2 focus:ring-theme-primary/20 min-w-[110px]"
          aria-label={ariaLabel}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Rows3 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <Select.Value>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {value} {labelSuffix}
              </span>
            </Select.Value>
          </div>

          <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
            <ChevronDown className="w-3.5 h-3.5" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 min-w-[130px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 animate-in fade-in-80 zoom-in-95"
            position="popper"
            sideOffset={6}
          >
            <Select.ScrollUpButton className="flex items-center justify-center py-1 text-slate-400 cursor-pointer">
              <ChevronUp className="w-4 h-4" />
            </Select.ScrollUpButton>

            <Select.Viewport className="p-1">
              {options.map((opt) => (
                <Select.Item
                  key={opt}
                  value={String(opt)}
                  className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                >
                  <Select.ItemText>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {opt} {labelSuffix}
                      </span>
                    </div>
                  </Select.ItemText>

                  <Select.ItemIndicator className="text-theme-primary pl-2">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </Select.ItemIndicator>
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

export default PageSizeSelect;
