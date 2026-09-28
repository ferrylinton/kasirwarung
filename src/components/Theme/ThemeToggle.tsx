import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { ACCENT_COLORS, AccentColor } from '../../types/theme';

export const ThemeToggle: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { accent, isDark, setAccent, toggleDark } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isEn = i18n.language && i18n.language.startsWith('en');

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeColorConfig = ACCENT_COLORS.find((c) => c.id === accent) || ACCENT_COLORS[7];

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={popoverRef}>
      {/* 1. Quick Dark / Light Toggle Button */}
      <button
        type="button"
        onClick={toggleDark}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title={isDark ? t('theme.light', 'Mode Terang (Light)') : t('theme.dark', 'Mode Gelap (Dark)')}
        aria-label="Toggle Dark Mode"
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
        )}
      </button>

      {/* 2. Accent Color Palette Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative flex items-center justify-center"
        title={t('theme.accentColor', 'Warna Aksen Aplikasi')}
        aria-label="Customize Theme Accent"
      >
        <Palette className="w-4 h-4" />
        {/* Dynamic color indicator dot */}
        <span
          className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900"
          style={{ backgroundColor: activeColorConfig.hex }}
        />
      </button>

      {/* 3. Popover Theme Customizer */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-primary" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {t('theme.title', 'Tema & Warna Aksen')}
              </h4>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{
                backgroundColor: activeColorConfig.light,
                color: activeColorConfig.text,
              }}
            >
              {isEn ? activeColorConfig.name : activeColorConfig.nameId}
            </span>
          </div>

          {/* Mode Switch (Light vs Dark) */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              {t('theme.mode', 'Mode Tampilan')}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  if (isDark) toggleDark();
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('theme.light', 'Terang')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isDark) toggleDark();
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('theme.dark', 'Gelap')}</span>
              </button>
            </div>
          </div>

          {/* 10 Accent Colors Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t('theme.accentColor', '10 Pilihan Warna Aksen')}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">10 Warna</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {ACCENT_COLORS.map((item) => {
                const isSelected = accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAccent(item.id as AccentColor);
                    }}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition cursor-pointer border ${
                      isSelected
                        ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                    title={`${isEn ? item.name : item.nameId} (${item.hex})`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 stroke-[3]"
                          style={{ color: item.fg }}
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 truncate max-w-full">
                      {isEn ? item.name : item.nameId}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ThemeToggle;
