import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Globe,
  Sun,
  Moon,
  Palette,
  Check,
  RotateCcw,
  LogOut,
  Database,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ACCENT_COLORS, AccentColor } from '../../types/theme';
import { setAppLanguage } from '../../i18n';

interface ConfigurationViewProps {
  onRequestLogout?: () => void;
  onNavigateToPOS?: () => void;
}

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({
  onRequestLogout,
  onNavigateToPOS,
}) => {
  const { t, i18n } = useTranslation();
  const { user, tenant } = useAuthStore();
  const { accent, isDark, setAccent, toggleDark, setDark } = useThemeStore();
  const { addToast } = useToastStore();

  const currentLang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'id';
  const isEn = currentLang === 'en';

  const activeColorConfig = ACCENT_COLORS.find((c) => c.id === accent) || ACCENT_COLORS[7];

  // Quick reset to default settings (Bahasa Indonesia & Hijau #198754 & Light mode)
  const handleResetToDefault = () => {
    setAppLanguage('id');
    setAccent('green');
    setDark(false);
    addToast({
      type: 'success',
      title: t('configuration.resetSuccessTitle', 'Konfigurasi Direset'),
      message: t(
        'configuration.resetSuccessMsg',
        'Bahasa dikembalikan ke Bahasa Indonesia dan tema warna ke Hijau default.'
      ),
    });
  };

  const handleLanguageSelect = (lang: 'id' | 'en') => {
    setAppLanguage(lang);
    addToast({
      type: 'info',
      title: t('language.currentLanguage', 'Bahasa Diperbarui'),
      message: t('language.switchedTo', {
        lang: lang === 'id' ? 'Bahasa Indonesia (ID)' : 'English (EN)',
      }),
    });
  };

  const handleAccentSelect = (newAccent: AccentColor) => {
    setAccent(newAccent);
    const targetConfig = ACCENT_COLORS.find((c) => c.id === newAccent);
    addToast({
      type: 'info',
      title: t('theme.accentColor', 'Warna Aksen Berubah'),
      message: `${isEn ? targetConfig?.name : targetConfig?.nameId} (${targetConfig?.hex}) berhasil diaktifkan.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-theme-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('configuration.title', 'Konfigurasi Sistem & Tampilan')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('configuration.title', 'Konfigurasi Sistem & Tampilan')}
          </h1>
        </div>

        {/* Action Controls: Reset & Logout Test */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors cursor-pointer"
            title="Kembalikan semua preferensi ke default bawaan"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{t('configuration.resetDefaultBtn', 'Reset ke Default')}</span>
          </button>

          {onRequestLogout && (
            <button
              type="button"
              onClick={onRequestLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
              title="Keluar akun untuk menguji persistensi bahasa & tema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('configuration.testLogoutBtn', 'Uji Coba Logout')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Persistent Logout Feature Guarantee Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-blue-950/30 border border-emerald-500/30 dark:border-emerald-600/30 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('configuration.persistCardTitle', 'Konfigurasi Tetap Digunakan Saat Logout')}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                ✓ Auto-Save LocalStorage
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                'configuration.persistCardDesc',
                'Preferensi bahasa, mode tampilan (terang/gelap), dan warna aksen disimpan di memori peramban (localStorage). Saat Anda keluar akun (logout), halaman Login, Register, dan sesi kasir berikutnya akan tetap memakai konfigurasi yang Anda tentukan.'
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Bahasa: <strong className="text-slate-800 dark:text-slate-200">{currentLang === 'id' ? 'Indonesia' : 'English'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Mode: <strong className="text-slate-800 dark:text-slate-200">{isDark ? 'Dark (Gelap)' : 'Light (Terang)'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Warna Aksen: <strong className="text-slate-800 dark:text-slate-200">{activeColorConfig.name} ({activeColorConfig.hex})</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Pemilihan Bahasa (Language Selection) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('configuration.languageSection', '1. Pilihan Bahasa Operasional')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('configuration.languageDesc', 'Pilih bahasa antarmuka aplikasi kasir dan laporan warung kelontong.')}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
            {currentLang.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Bahasa Indonesia */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('id')}
            className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer relative ${
              currentLang === 'id'
                ? 'border-theme-primary bg-theme-light ring-2 ring-theme-primary/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="text-3xl shrink-0 select-none">🇮🇩</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Bahasa Indonesia
                </span>
                {currentLang === 'id' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full btn-theme-primary">
                    ✓ Aktif
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Pilih ID</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Bahasa standar warung & toko kelontong di Indonesia dengan istilah sembako lokal (Kasir, Omzet, Kasbon, Struk, Sembako).
              </p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Kasir POS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Riwayat Penjualan
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Laci Kas Tunai
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Cetak Struk
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: English */}
          <button
            type="button"
            onClick={() => handleLanguageSelect('en')}
            className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer relative ${
              currentLang === 'en'
                ? 'border-theme-primary bg-theme-light ring-2 ring-theme-primary/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="text-3xl shrink-0 select-none">🇬🇧</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  English (International)
                </span>
                {currentLang === 'en' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full btn-theme-primary">
                    ✓ Active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Select EN</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Standard international terminology suitable for multi-lingual store attendants and general retail workflows.
              </p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Cashier POS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Sales History
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Cash Drawer
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                  Print Receipt
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Section 2: Mode Tampilan (Light vs Dark) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('theme.mode', '2. Mode Tampilan (Terang & Gelap)')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dukungan manual dark mode dengan class .dark pada root html & body.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => {
              if (isDark) toggleDark();
            }}
            className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer ${
              !isDark
                ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('theme.light', 'Mode Terang (Light Mode)')}
                </span>
                {!isDark && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    ✓ Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('theme.lightDesc', 'Tampilan bersih dengan kontras tinggi di siang hari')}
              </p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => {
              if (!isDark) toggleDark();
            }}
            className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer ${
              isDark
                ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-800 text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
              <Moon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('theme.dark', 'Mode Gelap (Dark Mode)')}
                </span>
                {isDark && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                    ✓ Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('theme.darkDesc', 'Tampilan nyaman yang mereduksi ketegangan mata di malam hari')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Section 3: 10 Accent Theme Colors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('theme.accentColor', '3. 10 Pilihan Warna Aksen Tema')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dukungan 10 warna aksen: Blue, Indigo, Purple, Pink, Red, Orange, Yellow, Green, Teal, dan Cyan.
              </p>
            </div>
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full font-mono shadow-xs"
            style={{
              backgroundColor: activeColorConfig.hex,
              color: activeColorConfig.fg,
            }}
          >
            {isEn ? activeColorConfig.name : activeColorConfig.nameId} ({activeColorConfig.hex})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {ACCENT_COLORS.map((item, idx) => {
            const isSelected = accent === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAccentSelect(item.id)}
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
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
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

      {/* 6. Section 4: Live Component UI Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('configuration.previewTitle', '4. Pratinjau Langsung Komponen UI')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'configuration.previewDesc',
                'Elemen antarmuka berikut langsung beradaptasi dengan bahasa dan warna aksen terpilih:'
              )}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box A: Tombol Aksi */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Gaya Tombol (Buttons)
              </span>
              <button
                type="button"
                className="w-full btn-theme-primary py-2 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{t('common.save', 'Simpan Data')}</span>
              </button>
              <button
                type="button"
                className="w-full btn-theme-outline py-2 px-3 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{t('common.cancel', 'Tombol Sekunder')}</span>
              </button>
            </div>

            {/* Box B: Status & Badge */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Badge Status & Tag
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="bg-theme-light border border-theme-border text-theme-text text-xs font-bold px-2.5 py-1 rounded-full">
                  {t('nav.storeOpen', 'Toko Buka')}
                </span>
                <span className="bg-theme-light border border-theme-border text-theme-text text-xs font-mono font-bold px-2.5 py-1 rounded-full">
                  104+ Produk
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total Belanja:{' '}
                <strong className="text-theme-primary font-mono text-sm block">
                  Rp 148.500
                </strong>
              </div>
            </div>

            {/* Box C: Input Field & Focus */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Form Input & Focus Ring
              </span>
              <input
                type="text"
                readOnly
                value="Beras Pandan Wangi 5kg"
                className="w-full px-3 py-2 text-xs rounded-xl border border-theme-primary bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 ring-2 ring-theme-primary/20 font-medium"
              />
              <span className="text-[10px] text-slate-400 block">
                Border & ring input otomatis cocok dengan warna aksen.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Section 5: LocalStorage Persistence & Diagnostics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 bg-theme-light rounded-xl text-theme-primary">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('configuration.diagnosticsTitle', '5. Status Penyimpanan & Diagnostik Sistem')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifikasi teknis bahwa parameter konfigurasi tersimpan di media penyimpanan persisten browser.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Kunci (Storage Key)</th>
                <th className="py-2.5 px-3">Nilai Aktif</th>
                <th className="py-2.5 px-3">Status Saat Logout</th>
                <th className="py-2.5 px-3">Deskripsi Fungsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-theme-primary">
                  kasirwarung_language
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                    "{currentLang}"
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dipertahankan (Tetap Aktif)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  Bahasa antarmuka pengguna ({currentLang === 'id' ? 'Bahasa Indonesia' : 'English'})
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-theme-primary">
                  kasirwarung_theme_dark
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                    "{isDark ? 'true' : 'false'}"
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dipertahankan (Tetap Aktif)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  Manual Dark Mode ({isDark ? 'Mode Gelap Aktif' : 'Mode Terang Aktif'})
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-theme-primary">
                  kasirwarung_theme_accent
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                    "{accent}"
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dipertahankan (Tetap Aktif)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  10 Warna Aksen ({activeColorConfig.name} - {activeColorConfig.hex})
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  kasirwarung_jwt_token
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-400">
                  {user ? 'Bearer JWT (Active)' : 'null'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-rose-500 font-semibold text-[11px]">
                    Dihapus Aman Saat Logout
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  Kredensial otentikasi sesi kasir (dihapus untuk keamanan toko)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-theme-primary">
                  kasirwarung_active_cart
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                  Data Keranjang Aktif (JSON)
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-rose-500 font-semibold text-[11px]">
                    Dihapus Aman Saat Logout
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  Penyimpanan sementara keranjang kasir (otomatis bersih saat keluar)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-theme-primary">
                  kasirwarung_saved_orders
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                  Pesanan Ditahan / Hold (JSON)
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-rose-500 font-semibold text-[11px]">
                    Dihapus Aman Saat Logout
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                  Daftar pesanan yang ditahan/disimpan kasir (otomatis bersih saat keluar)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;
