import React from 'react';
import * as Select from '@radix-ui/react-select';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { setAppLanguage } from '../i18n';
import { useToastStore } from '../store/toastStore';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'auth' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { i18n, t } = useTranslation();
  const { addToast } = useToastStore();

  const currentLang = (i18n.language && i18n.language.startsWith('en')) ? 'en' : 'id';

  const handleLanguageChange = (value: string) => {
    const lang = value as 'id' | 'en';
    setAppLanguage(lang);
    addToast({
      type: 'info',
      title: t('language.currentLanguage', 'Bahasa'),
      message: t('language.switchedTo', {
        lang: lang === 'id' ? 'Bahasa Indonesia' : 'English',
      }),
    });
  };

  const isAuth = variant === 'auth';
  const isCompact = variant === 'compact';

  return (
    <Select.Root value={currentLang} onValueChange={handleLanguageChange}>
      <Select.Trigger
        className={`inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none focus:outline-hidden ${
          isAuth
            ? 'bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs'
            : isCompact
            ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs'
        } ${className}`}
        aria-label={t('language.selectLanguage', 'Pilih Bahasa')}
      >
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-theme-primary shrink-0" />
          <Select.Value>
            {currentLang === 'id' ? (
              <span className="flex items-center gap-1">
                <span>🇮🇩</span>
                <span className={isCompact ? 'hidden' : 'inline'}>ID</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span>🇬🇧</span>
                <span className={isCompact ? 'hidden' : 'inline'}>EN</span>
              </span>
            )}
          </Select.Value>
        </span>
        <Select.Icon className="text-slate-400 dark:text-slate-500">
          <ChevronDown className="w-3.5 h-3.5" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 min-w-[170px] overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
          position="popper"
          sideOffset={5}
        >
          <Select.Viewport className="p-0.5 space-y-1">
            <Select.Item
              value="id"
              className="flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
            >
              <Select.ItemText>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇮🇩</span>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">Indonesia</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Bahasa Utama (Default)</div>
                  </div>
                </div>
              </Select.ItemText>
              <Select.ItemIndicator className="text-theme-primary pl-2">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </Select.ItemIndicator>
            </Select.Item>

            <Select.Item
              value="en"
              className="flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-theme-light hover:text-theme-text data-[highlighted]:bg-theme-light data-[highlighted]:text-theme-text transition-colors"
            >
              <Select.ItemText>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇬🇧</span>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">English</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">International (EN)</div>
                  </div>
                </div>
              </Select.ItemText>
              <Select.ItemIndicator className="text-theme-primary pl-2">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </Select.ItemIndicator>
            </Select.Item>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
