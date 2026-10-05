import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface CategoryItem {
  name: string;
  count: number;
}

export interface CategorySelectProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: CategoryItem[];
  totalCount?: number;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
  totalCount,
  className = '',
}) => {
  const { t } = useTranslation();

  const currentItem = categories.find((c) => c.name === selectedCategory);
  const currentCount = currentItem?.count ?? (totalCount ?? 0);

  const getCategoryDisplayName = (catName: string) => {
    if (catName === 'Semua Produk' || catName === 'Semua') {
      return t('catalog.allCategories', 'Semua Kategori Produk');
    }
    return t(`catalog.categoryNames.${catName}`, catName);
  };

  return (
    <div className={`flex-1 sm:max-w-md ${className}`}>
      <Select.Root
        value={selectedCategory}
        onValueChange={onSelectCategory}
      >
        <Select.Trigger
          className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer outline-hidden focus:ring-2 focus:ring-theme-primary/20"
          aria-label={t('catalog.tableCategory', 'Pilih Kategori Produk')}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-theme-primary shrink-0" />
            <Select.Value>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {getCategoryDisplayName(selectedCategory)}
              </span>
            </Select.Value>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {t('catalog.itemCountBadge', '{{count}} Item', { count: currentCount })}
            </span>
            <Select.Icon className="text-slate-400 dark:text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </Select.Icon>
          </div>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 min-w-[280px] max-h-80 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 animate-in fade-in-80 zoom-in-95"
            position="popper"
            sideOffset={6}
          >
            <Select.ScrollUpButton className="flex items-center justify-center py-1 text-slate-400 cursor-pointer">
              <ChevronUp className="w-4 h-4" />
            </Select.ScrollUpButton>

            <Select.Viewport className="p-1">
              {categories.map((cat) => {
                const displayName = getCategoryDisplayName(cat.name);
                return (
                  <Select.Item
                    key={cat.name}
                    value={cat.name}
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
                  >
                    <Select.ItemText>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {displayName}
                        </span>
                      </div>
                    </Select.ItemText>

                    <div className="flex items-center gap-2 pl-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                        {cat.count}
                      </span>
                      <Select.ItemIndicator className="text-theme-primary">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </Select.ItemIndicator>
                    </div>
                  </Select.Item>
                );
              })}
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

export default CategorySelect;
