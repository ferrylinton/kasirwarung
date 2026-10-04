import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Sun, Moon, Palette, Check, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/themeStore';
import { ACCENT_COLORS, AccentColor } from '../../types/theme';

export const ThemeToggle: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { accent, isDark, setAccent, toggleDark } = useThemeStore();

  const isEn = i18n.language && i18n.language.startsWith('en');
  const activeColorConfig = ACCENT_COLORS.find((c) => c.id === accent) || ACCENT_COLORS[7];

  return (
    <div className="relative inline-flex items-center gap-1">
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

      {/* 2. Accent Color Palette Selector Button & Radix Popover */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative flex items-center justify-center data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:ring-2 data-[state=open]:ring-theme-primary/30"
            title={t('theme.accentColor', 'Warna Aksen Aplikasi')}
            aria-label="Customize Theme Accent"
          >
            <Palette className="w-4 h-4" />
            {/* Dynamic color indicator dot */}
            <span
              className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-xs"
              style={{ backgroundColor: activeColorConfig.hex }}
            />
          </button>
        </Popover.Trigger>

        {/* 3. Popover Theme Customizer (Radix UI Primitive - Responsive across Mobile, Tablet & Desktop) */}
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 w-[calc(100vw-1.5rem)] sm:w-[350px] md:w-[380px] max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 sm:p-4.5 select-none outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-theme-light flex items-center justify-center text-theme-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {t('theme.title', 'Tema & Warna Aksen')}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{
                    backgroundColor: activeColorConfig.light,
                    color: activeColorConfig.text,
                  }}
                >
                  {isEn ? activeColorConfig.name : activeColorConfig.nameId}
                </span>
                <Popover.Close asChild>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Popover.Close>
              </div>
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
                  className={`flex items-center justify-center gap-1.5 py-2 sm:py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                  className={`flex items-center justify-center gap-1.5 py-2 sm:py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
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

            {/* 10 Accent Colors Grid (Mobile, Tablet, Desktop Responsive) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('theme.accentColor', '10 Pilihan Warna Aksen')}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">10 Warna</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {ACCENT_COLORS.map((item) => {
                  const isSelected = accent === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAccent(item.id as AccentColor);
                      }}
                      className={`group relative flex flex-col items-center justify-center py-2 px-1 sm:p-1.5 rounded-xl transition cursor-pointer border ${
                        isSelected
                          ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 shadow-xs'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                      title={`${isEn ? item.name : item.nameId} (${item.hex})`}
                    >
                      <span
                        className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
                        style={{ backgroundColor: item.hex }}
                      >
                        {isSelected && (
                          <Check
                            className="w-3.5 h-3.5 stroke-[3]"
                            style={{ color: item.fg }}
                          />
                        )}
                      </span>
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 truncate max-w-full text-center">
                        {isEn ? item.name : item.nameId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Accent Preview Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Pratinjau aksen:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="btn-theme-primary px-2.5 py-0.5 rounded-md text-[10px] font-bold shadow-2xs">
                  Tombol
                </span>
                <span className="bg-theme-light text-theme-primary px-2 py-0.5 rounded-md text-[10px] font-bold border border-theme-border">
                  Badge
                </span>
              </div>
            </div>

            <Popover.Arrow className="fill-white dark:fill-slate-900" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export const ThemeCustomizerPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { accent, isDark, setAccent, toggleDark } = useThemeStore();
  const isEn = i18n.language && i18n.language.startsWith('en');
  const activeColorConfig = ACCENT_COLORS.find((c) => c.id === accent) || ACCENT_COLORS[7];

  return (
    <div className="space-y-6">
      {/* 1. Mode Tampilan (Dark vs Light) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          {t('theme.mode', 'Mode Tampilan')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Pilih antara mode terang untuk pencahayaan optimal atau mode gelap untuk kenyamanan mata di malam hari.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => {
              if (isDark) toggleDark();
            }}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
              !isDark
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {t('theme.light', 'Mode Terang (Light)')}
                </span>
                {!isDark && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-full">
                    {t('theme.activeBadge', 'Aktif')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('theme.lightDesc', 'Tampilan bersih dengan kontras tinggi di siang hari')}
              </p>
            </div>
          </button>

          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => {
              if (!isDark) toggleDark();
            }}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
              isDark
                ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {t('theme.dark', 'Mode Gelap (Dark)')}
                </span>
                {isDark && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                    {t('theme.activeBadge', 'Aktif')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('theme.darkDesc', 'Tampilan nyaman yang mereduksi ketegangan mata di malam hari')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. 10 Accent Theme Colors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t('theme.accentColor', '10 Pilihan Warna Aksen Tema')}
          </h3>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full font-mono shadow-xs"
            style={{
              backgroundColor: activeColorConfig.hex,
              color: activeColorConfig.fg,
            }}
          >
            {isEn ? activeColorConfig.name : activeColorConfig.nameId} ({activeColorConfig.hex})
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Warna aksen akan diterapkan secara langsung ke tombol, menu aktif, badge pesanan, ikon, dan aksen visual lainnya di seluruh aplikasi.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ACCENT_COLORS.map((item) => {
            const isSelected = accent === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAccent(item.id as AccentColor)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-offset-slate-900 border-slate-400 dark:border-slate-600 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-110"
                    style={{ backgroundColor: item.hex }}
                  >
                    {isSelected && (
                      <Check
                        className="w-4 h-4 stroke-[3]"
                        style={{ color: item.fg }}
                      />
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      ✓ Aktif
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isEn ? item.name : item.nameId}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 font-medium">
                    {item.hex}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Preview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Pratinjau Langsung Tema ({isEn ? activeColorConfig.name : activeColorConfig.nameId})
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Berikut adalah contoh elemen antarmuka yang langsung terpengaruh oleh warna aksen terpilih:
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-4">
          {/* Row of buttons and badges */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-theme-primary px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Tombol Utama (Primary)
            </button>

            <button
              type="button"
              className="btn-theme-outline px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Tombol Sekunder (Outline)
            </button>

            <span className="bg-theme-light px-3 py-1 rounded-full text-xs font-bold border border-theme-border">
              Badge Status
            </span>

            <span className="text-theme-primary font-mono font-bold text-sm">
              Rp 125.000 (Harga/Nominal)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
