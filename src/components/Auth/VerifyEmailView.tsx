import React, { useState } from 'react';
import { MailCheck, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { LanguageSelector } from '../LanguageSelector';

interface VerifyEmailViewProps {
  initialToken?: string;
  initialEmail?: string;
  onVerifiedSuccess: () => void;
  onBackToLogin: () => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  initialToken = '',
  initialEmail = '',
  onVerifiedSuccess,
  onBackToLogin,
}) => {
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      addToast({
        type: 'warning',
        title: t('common.warning', 'Peringatan'),
        message: 'Masukkan token verifikasi dari email Anda.',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-language': i18n.language || 'id',
        },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('common.error', 'Verifikasi gagal'));
      }

      setAuth(data.token, data.user, undefined, data.refreshToken);
      addToast({
        type: 'success',
        title: t('auth.loginSuccessTitle', 'Verifikasi Berhasil!'),
        message: data.message || 'Akun Anda telah aktif dan dapat digunakan.',
      });

      onVerifiedSuccess();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('common.error', 'Verifikasi Gagal'),
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      {/* Top right language switcher in auth view */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector variant="auth" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 overflow-hidden relative text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs mb-4">
          <MailCheck className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {t('auth.verifyTitle', 'Verifikasi Akun Warung')}
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {initialEmail
            ? `Email verifikasi telah dikirimkan ke ${initialEmail}. Silakan periksa inbox email Anda atau gunakan token di bawah.`
            : t('auth.verifySubtitle', 'Masukkan kode / token verifikasi yang dikirimkan ke alamat email Anda untuk mengaktifkan akun.')}
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('auth.verifyTokenLabel', 'Token Verifikasi Akun')}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="verify-174..."
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{loading ? t('auth.verifying', 'Mengaktifkan...') : t('auth.verifyBtn', 'Aktivasi & Mulai Berjualan')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onBackToLogin}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            {t('auth.backToLogin', 'Kembali ke Halaman Masuk')}
          </button>
        </div>
      </div>
    </div>
  );
};
