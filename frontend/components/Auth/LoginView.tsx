import React, { useState } from 'react';
import { z } from 'zod';
import { ShoppingBag, Lock, Mail, Store, Shield, ArrowRight, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { LanguageSelector } from '../LanguageSelector';
import { ThemeToggle } from '../Theme/ThemeToggle';

const LoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onSwitchToVerify: (token?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSwitchToRegister,
  onSwitchToVerify,
}) => {
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = LoginSchema.safeParse(formData);
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

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-language': i18n.language || 'id',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('common.error', 'Gagal masuk akun'));
      }

      setAuth(data.token, data.user, undefined, data.refreshToken);
      addToast({
        type: 'success',
        title: t('auth.loginSuccessTitle', 'Login Berhasil'),
        message: data.message || t('auth.loginSuccessMsg', 'Selamat datang kembali!'),
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('common.error', 'Gagal Masuk'),
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (email: string, pass: string, label: string) => {
    setFormData({ email, password: pass });
    setErrors({});
    addToast({
      type: 'info',
      title: 'Demo Akun Dipilih',
      message: `Kredensial untuk role ${label} telah dimuat. Klik tombol Masuk.`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4 relative transition-colors">
      {/* Top right language switcher and theme toggle in auth view */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSelector variant="auth" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 sm:p-8 overflow-hidden relative">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 btn-theme-primary rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
            <ShoppingBag className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">KasirWarung</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('auth.loginSubtitle', 'Kelola kasir, penjualan, dan stok sembako dengan mudah dan cepat.')}
          </p>
        </div>

        {/* Demo Accounts Quick-Select Buttons */}
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
            ⚡ {t('auth.demoAccountsTitle', 'Akun Demo Siap Pakai (1-Click Fill)')}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fillQuickDemo('kasir@berkahjaya.com', 'Kasir123!', 'CASHIER (Bu Siti)')}
              className="py-1.5 px-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-slate-700 hover:text-emerald-800 font-bold transition-all text-center"
            >
              Kasir (Bu Siti)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('manager@berkahjaya.com', 'Manager123!', 'MANAGER (Bu Siti Rahma)')}
              className="py-1.5 px-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-slate-700 hover:text-emerald-800 font-bold transition-all text-center"
            >
              Manager Warung
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('admin@kasirwarung.com', 'Admin123!', 'ADMIN (Super Admin)')}
              className="py-1.5 px-2 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-500 rounded-xl text-slate-700 hover:text-purple-800 font-bold transition-all text-center"
            >
              Admin Global
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('auth.emailLabel', 'Alamat Email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('auth.emailPlaceholder', 'nama@warunganda.com')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.email ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('auth.passwordLabel', 'Kata Sandi')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('auth.passwordPlaceholder', '••••••••')}
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.password ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
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
            <span>{loading ? t('auth.loggingIn', 'Memproses Masuk...') : t('auth.loginBtn', 'Masuk ke KasirWarung')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer switcher */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t('auth.noAccount', 'Belum punya akun warung?')}{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-theme-primary font-bold hover:underline cursor-pointer"
            >
              {t('auth.registerHere', 'Daftar Toko Baru')}
            </button>
          </p>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {t('auth.verifySubtitle', 'Punya kode verifikasi email?')}{' '}
            <button
              onClick={() => onSwitchToVerify()}
              className="text-theme-primary font-semibold hover:underline cursor-pointer"
            >
              {t('auth.verifyBtn', 'Aktivasi Akun di Sini')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
