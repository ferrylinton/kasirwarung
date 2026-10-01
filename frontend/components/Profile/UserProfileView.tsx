import React, { useState } from 'react';
import { z } from 'zod';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Save,
  Check,
  Palette,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { ThemeCustomizerPanel } from '../Theme/ThemeToggle';

// Client-side Zod validation schemas
const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
    confirmPassword: z.string().min(6, 'Konfirmasi kata sandi minimal 6 karakter'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini',
    path: ['newPassword'],
  });

const ProfileUpdateFormSchema = z.object({
  name: z.string().trim().min(2, 'Nama pengguna minimal 2 karakter'),
  phone: z.string().trim().optional(),
});

type PasswordFormData = z.infer<typeof ChangePasswordFormSchema>;
type ProfileFormData = z.infer<typeof ProfileUpdateFormSchema>;

export const UserProfileView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, tenant, token, tokenMeta, updateUser } = useAuthStore();
  const { addToast } = useToastStore();

  // Active view tab inside profile
  const [activeTab, setActiveTab] = useState<'password' | 'info' | 'theme'>('password');

  // Change Password State
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof PasswordFormData, string>>>({});
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Profile Edit State
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Real-time password requirement checks
  const hasMinLength = passwordData.newPassword.length >= 6;
  const isDifferentFromCurrent =
    Boolean(passwordData.currentPassword) &&
    Boolean(passwordData.newPassword) &&
    passwordData.newPassword !== passwordData.currentPassword;
  const doesConfirmMatch =
    Boolean(passwordData.newPassword) &&
    Boolean(passwordData.confirmPassword) &&
    passwordData.newPassword === passwordData.confirmPassword;

  // Handle Change Password Form Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSuccess(false);

    // Validate using Zod
    const validation = ChangePasswordFormSchema.safeParse(passwordData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof PasswordFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof PasswordFormData;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setPasswordErrors(fieldErrors);

      addToast({
        type: 'error',
        title: t('common.validationError', 'Validasi Gagal'),
        message: validation.error.issues[0]?.message || 'Silakan lengkapi formulir kata sandi dengan benar.',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': i18n.language || 'id',
        },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'INVALID_CURRENT_PASSWORD') {
          setPasswordErrors({ currentPassword: data.message });
        } else if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors: Partial<Record<keyof PasswordFormData, string>> = {};
          data.errors.forEach((issue: any) => {
            const fieldName = issue.path?.[0] as keyof PasswordFormData;
            if (fieldName) fieldErrors[fieldName] = issue.message;
          });
          setPasswordErrors(fieldErrors);
        }
        throw new Error(data.message || 'Gagal mengubah kata sandi');
      }

      // Success
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      addToast({
        type: 'success',
        title: t('common.success', 'Berhasil'),
        message: data.message || t('profile.passwordChanged', 'Kata sandi berhasil diubah!'),
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('common.error', 'Gagal'),
        message: err.message || 'Terjadi kesalahan saat mengubah kata sandi.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Profile Update Form Submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSuccess(false);

    // Validate using Zod
    const validation = ProfileUpdateFormSchema.safeParse(profileData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof ProfileFormData, string>> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof ProfileFormData;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setProfileErrors(fieldErrors);

      addToast({
        type: 'error',
        title: t('common.validationError', 'Validasi Gagal'),
        message: validation.error.issues[0]?.message || 'Silakan lengkapi data profil dengan benar.',
      });
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': i18n.language || 'id',
        },
        body: JSON.stringify(validation.data),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memperbarui profil');
      }

      // Update store
      if (data.user) {
        updateUser(data.user);
      }

      setProfileSuccess(true);
      addToast({
        type: 'success',
        title: t('common.success', 'Berhasil'),
        message: data.message || t('profile.profileSaved', 'Data profil berhasil diperbarui!'),
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: t('common.error', 'Gagal'),
        message: err.message || 'Terjadi kesalahan saat memperbarui profil.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" />
            {t('nav.roles.admin', 'Admin Global')}
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            {t('nav.roles.manager', 'Manajer Toko')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <UserIcon className="w-3 h-3" />
            {t('nav.roles.cashier', 'Kasir Utama')}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-emerald-100 shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {user?.name || 'Pengguna KasirWarung'}
              </h1>
              {getRoleBadge(user?.role)}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {tenant?.name || user?.tenantName || 'Berkah Jaya'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('profile.verified', 'Email Terverifikasi')}
              </span>
            </p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('profile.securityTab', 'Ubah Kata Sandi')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{t('profile.personalInfoTab', 'Informasi Akun')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'theme'
                ? 'btn-theme-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t('theme.title', 'Tema & Tampilan')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Form, Right is Info & Security Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: UBAH KATA SANDI (Change Password Feature with Zod Validation) */}
          {activeTab === 'password' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-600" />
                    {t('profile.changePasswordTitle', 'Ubah Kata Sandi Akun')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t(
                      'profile.changePasswordSubtitle',
                      'Pastikan kata sandi Anda kuat untuk melindungi akun dan keamanan transaksi toko.'
                    )}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Zod Validated
                </span>
              </div>

              {passwordSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {t('profile.passwordChanged', 'Kata sandi berhasil diubah!')}
                    </div>
                    <div className="text-emerald-700 mt-0.5">
                      Gunakan kata sandi baru Anda saat masuk ke akun KasirWarung berikutnya.
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* 1. Kata Sandi Saat Ini */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('profile.currentPassword', 'Kata Sandi Saat Ini')}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                        if (passwordErrors.currentPassword) {
                          setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                        }
                      }}
                      placeholder={t('profile.currentPasswordPlaceholder', 'Masukkan kata sandi lama Anda')}
                      className={`w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all text-slate-800 ${
                        passwordErrors.currentPassword
                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                          : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordErrors.currentPassword}</span>
                    </div>
                  )}
                </div>

                {/* 2. Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('profile.newPassword', 'Kata Sandi Baru')}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        if (passwordErrors.newPassword) {
                          setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                        }
                      }}
                      placeholder={t('profile.newPasswordPlaceholder', 'Minimal 6 karakter kombinasi baru')}
                      className={`w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all text-slate-800 ${
                        passwordErrors.newPassword
                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                          : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordErrors.newPassword}</span>
                    </div>
                  )}
                </div>

                {/* 3. Konfirmasi Kata Sandi Baru */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('profile.confirmPassword', 'Konfirmasi Kata Sandi Baru')}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                        if (passwordErrors.confirmPassword) {
                          setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                        }
                      }}
                      placeholder={t('profile.confirmPasswordPlaceholder', 'Ketik ulang kata sandi baru Anda')}
                      className={`w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all text-slate-800 ${
                        passwordErrors.confirmPassword
                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                          : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                {/* Real-time Checklist Criteria */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    {t('profile.passwordRequirements', 'Ketentuan Kata Sandi:')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div
                      className={`flex items-center gap-1.5 ${
                        hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          hasMinLength ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[11px]">{t('profile.reqMinLength', 'Minimal 6 karakter')}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        isDifferentFromCurrent ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isDifferentFromCurrent
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[11px]">
                        {t('profile.reqDifferent', 'Berbeda dengan saat ini')}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        doesConfirmMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          doesConfirmMatch ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[11px]">
                        {t('profile.reqMatch', 'Konfirmasi cocok')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('profile.savingPassword', 'Memproses Kata Sandi...')}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{t('profile.savePassword', 'Simpan Kata Sandi Baru')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: INFORMASI AKUN (User Profile Details) */}
          {activeTab === 'info' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-emerald-600" />
                  {t('profile.personalInfoTab', 'Informasi Akun')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Perbarui nama tampilan dan kontak Anda untuk memudahkan komunikasi tim kasir.
                </p>
              </div>

              {profileSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      {t('profile.profileSaved', 'Data profil berhasil diperbarui!')}
                    </div>
                    <div className="text-emerald-700 mt-0.5">
                      Perubahan nama dan kontak Anda langsung disinkronkan ke seluruh sistem.
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Pengguna */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('profile.fullName', 'Nama Lengkap')}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => {
                        setProfileData({ ...profileData, name: e.target.value });
                        if (profileErrors.name) {
                          setProfileErrors({ ...profileErrors, name: undefined });
                        }
                      }}
                      placeholder={t('profile.fullNamePlaceholder', 'Masukkan nama lengkap')}
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-slate-50 focus:bg-white focus:outline-hidden transition-all text-slate-800 ${
                        profileErrors.name
                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                          : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                    {profileErrors.name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{profileErrors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Alamat Email (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('profile.email', 'Alamat Email')}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Telepon / WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('profile.phone', 'Nomor Telepon / WhatsApp')}
                    </label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder={t('profile.phonePlaceholder', 'Contoh: 08123456789')}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all text-slate-800"
                    />
                  </div>

                  {/* Peran / Hak Akses (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('profile.role', 'Peran Akun')}
                    </label>
                    <input
                      type="text"
                      value={user?.role || 'CASHIER'}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed font-semibold"
                    />
                  </div>

                  {/* Warung / Tenant (Read Only) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('profile.tenant', 'Warung / Usaha')}
                    </label>
                    <input
                      type="text"
                      value={tenant?.name || user?.tenantName || 'Berkah Jaya'}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 cursor-pointer"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('profile.savingProfile', 'Menyimpan Profil...')}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{t('profile.saveProfile', 'Simpan Perubahan Profil')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: TEMA & TAMPILAN (10 Accent Theme Colors & Dark Mode) */}
          {activeTab === 'theme' && (
            <ThemeCustomizerPanel />
          )}
        </div>

        {/* Right 1 Column: Security Overview, Account Tips, Session Meta */}
        <div className="space-y-6">
          {/* Security Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {t('profile.securityAdvice', 'Tips Keamanan Akun')}
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{t('profile.securityTip1', 'Jangan bagikan kata sandi akun Anda kepada siapapun.')}</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'profile.securityTip2',
                    'Gunakan kombinasi huruf, angka, dan simbol untuk keamanan maksimal.'
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'profile.securityTip3',
                    'Selalu lakukan Logout bila selesai bertugas di kasir bersama.'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Session Diagnostics Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              {t('profile.sessionInfo', 'Status Sesi Akun')}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Auto Idle Logout</span>
                <span className="font-semibold text-slate-800">
                  {tokenMeta?.idleTimeoutMinutes || 5} Menit
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Online Cloud Sync</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Keamanan Token</span>
                <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 text-[11px]">
                  JWT + Denylist
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
