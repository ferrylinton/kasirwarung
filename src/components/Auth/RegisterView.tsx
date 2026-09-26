import React, { useState } from 'react';
import { z } from 'zod';
import { Store, User, Mail, Lock, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const RegisterFormSchema = z.object({
  tenantName: z.string().min(3, 'Nama warung / toko minimal 3 karakter'),
  name: z.string().min(2, 'Nama pemilik / manajer minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z
    .string()
    .min(6, 'Kata sandi minimal 6 karakter')
    .regex(/[A-Z]/, 'Harus mengandung minimal 1 huruf besar')
    .regex(/[0-9]/, 'Harus mengandung minimal 1 angka'),
});

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onRegisteredSuccess: (email: string, token: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onRegisteredSuccess,
}) => {
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

    const parsed = RegisterFormSchema.safeParse(formData);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Pendaftaran gagal');
      }

      addToast({
        type: 'success',
        title: 'Pendaftaran Berhasil!',
        message: 'Akun MANAGER telah didaftarkan dan email verifikasi telah dikirim.',
        duration: 5000,
      });

      onRegisteredSuccess(formData.email, data.verificationToken);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Pendaftaran Gagal',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 overflow-hidden relative">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-200 mb-3">
            <ShoppingBag className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftarkan Toko Kelontong</h1>
          <p className="text-xs text-slate-500 mt-1">
            Akun akan didaftarkan otomatis sebagai <span className="font-bold text-emerald-700">Role MANAGER</span>
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Tenant Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Toko / Warung Kelontong <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                placeholder="Contoh: Toko Berkah Jaya, Warung Bu Sri"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.tenantName ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.tenantName && <p className="text-xs text-rose-500 mt-1">{errors.tenantName}</p>}
          </div>

          {/* User Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pemilik / Manajer <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Bu Siti Rahma"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.name ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Warung (Untuk Verifikasi Akun) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="pemilik@warunganda.com"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.email ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          {/* Secure Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kata Sandi Aman <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimal 6 karakter, 1 huruf besar & angka"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all ${
                  errors.password ? 'border-rose-400 focus:ring-2 focus:ring-rose-100' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-snug">
            Email verifikasi akan otomatis dikirimkan ke alamat email di atas untuk mengaktifkan akun toko kelontong Anda.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            <span>{loading ? 'Mendaftarkan Warung...' : 'Daftar Sebagai Manager Toko'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Sudah memiliki akun kasir / manager?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-emerald-700 font-bold hover:underline"
            >
              Masuk di sini
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
