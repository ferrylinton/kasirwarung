import React, { useState } from 'react';
import { z } from 'zod';
import { Store, User, Mail, Lock, ShoppingBag, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../stores/toastStore';
import { LanguageSelector } from '../LanguageSelector';
import { ThemeToggle } from '../Theme/ThemeToggle';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onRegisteredSuccess: (email: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onRegisteredSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();

  const [formData, setFormData] = useState({
    tenantName: '',
    name: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const registerFormSchema = z.object({
      tenantName: z.string().min(3, t('auth.tenantNameRequired', 'Nama warung / toko minimal 3 karakter')),
      name: z.string().min(2, t('auth.ownerNameRequired', 'Nama pemilik / manajer minimal 2 karakter')),
      email: z.string().email(t('auth.invalidEmail', 'Format email tidak valid')),
      password: z
        .string()
        .min(6, t('auth.passwordMinLength', 'Kata sandi minimal 6 karakter'))
        .regex(/[A-Z]/, t('auth.passwordUppercase', 'Harus mengandung minimal 1 huruf besar'))
        .regex(/[0-9]/, t('auth.passwordNumber', 'Harus mengandung minimal 1 angka')),
    });

    const parsed = registerFormSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: { [key: string]: string } = {};
      parsed.error.issues.forEach((iss) => {
        if (iss.path[0]) fieldErrors[iss.path[0].toString()] = iss.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-language': i18n.language || 'id',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('auth.registerFailedDefault', 'Pendaftaran gagal'));
      }

      const registeredEmail = formData.email;

      setFormData({
        tenantName: '',
        name: '',
        email: '',
        password: '',
      });
      setErrors({});

      addToast({
        type: 'success',
        title: t('auth.registerSuccessTitle', 'Pendaftaran Berhasil!'),
        message: data.message || t('auth.registerSuccessMsg', 'Akun MANAGER telah didaftarkan dan email verifikasi telah dikirim.'),
        duration: 5000,
      });

      onRegisteredSuccess(registeredEmail);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('auth.registerFailed', 'Pendaftaran Gagal'),
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 relative transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 overflow-hidden relative">
        {/* Language switcher and theme toggle centered at the top of login box */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl shadow-2xs">
            <ThemeToggle />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <LanguageSelector variant="compact" />
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 btn-theme-primary rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
            <ShoppingBag className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('auth.registerTitle', 'Daftarkan Toko Kelontong')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('auth.registerSubtitle', 'Mulai kelola kasir dan inventaris toko kelontong Anda sekarang.')}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Tenant Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.storeNameLabel', 'Nama Toko / Warung Kelontong')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.tenantName}
                onChange={(e) => {
                  setFormData({ ...formData, tenantName: e.target.value });
                  if (errors.tenantName) setErrors((prev) => ({ ...prev, tenantName: '' }));
                }}
                placeholder={t('auth.storeNamePlaceholder', 'Contoh: Toko Berkah Jaya')}
                aria-label={t('auth.storeNameLabel', 'Nama Toko / Warung Kelontong')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/80 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all ${
                  errors.tenantName
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.tenantName && <p className="text-xs text-rose-500 mt-1">{errors.tenantName}</p>}
          </div>

          {/* User Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.ownerNameLabel', 'Nama Pemilik / Manajer')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder={t('auth.ownerNamePlaceholder', 'Contoh: Bu Siti Rahma')}
                aria-label={t('auth.ownerNameLabel', 'Nama Pemilik / Manajer')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/80 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all ${
                  errors.name
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.registerEmailLabel', 'Email Warung (Untuk Verifikasi Akun)')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder={t('auth.registerEmailPlaceholder', 'pemilik@warunganda.com')}
                aria-label={t('auth.registerEmailLabel', 'Email Warung (Untuk Verifikasi Akun)')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/80 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all ${
                  errors.email
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          {/* Secure Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.registerPasswordLabel', 'Kata Sandi Aman')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder={t('auth.registerPasswordPlaceholder', 'Minimal 6 karakter, 1 huruf besar & angka')}
                aria-label={t('auth.registerPasswordLabel', 'Kata Sandi Aman')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/80 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all ${
                  errors.password
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-theme-primary disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            <span>{loading ? t('auth.registering', 'Mendaftarkan Warung...') : t('auth.registerManagerBtn', 'Daftar Sebagai Manager Toko')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t('auth.haveAccountPrompt', 'Sudah memiliki akun kasir / manager?')}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-theme-primary font-bold hover:underline cursor-pointer"
            >
              {t('auth.backToLogin', 'Masuk di sini')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
