import React, { useState, useEffect, useMemo } from 'react';
import {
  Users2,
  Shield,
  KeyRound,
  Search,
  RotateCcw,
  Store,
  Building2,
  UserCheck,
  UserX,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Calendar,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { userService } from '../../services/userService';
import { AdminUserItem, Role } from '../../types/user';
import { formatDate } from '../../utils/formatDate';

export const UserManagementView: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Change Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Status Toggle Confirmation State
  const [statusConfirmUser, setStatusConfirmUser] = useState<AdminUserItem | null>(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const fetchUsers = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      addToast({
        type: 'error',
        title: t('common.error', 'Terjadi Kesalahan'),
        message: err.message || 'Gagal memuat data pengguna',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Unique tenants list for filter
  const tenantOptions = useMemo(() => {
    const tenantsMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.tenantId && u.tenantName) {
        tenantsMap.set(u.tenantId, u.tenantName);
      }
    });
    return Array.from(tenantsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // Tenant filter
      if (tenantFilter === 'GLOBAL_ADMIN') {
        if (u.role !== 'ADMIN') return false;
      } else if (tenantFilter !== 'ALL' && u.tenantId !== tenantFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesTenant = (u.tenantName || '').toLowerCase().includes(query);
        const matchesPhone = (u.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesTenant && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, tenantFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const uniqueTenants = new Set(users.map((u) => u.tenantId).filter(Boolean)).size;
    return { total, active, inactive, uniqueTenants };
  }, [users]);

  // Handle Status Toggle
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmUser) return;

    if (currentUser?.id === statusConfirmUser.id && statusConfirmUser.isActive) {
      addToast({
        type: 'warning',
        title: 'Tindakan Ditolak',
        message: 'Anda tidak dapat menonaktifkan akun Admin Anda sendiri.',
      });
      setStatusConfirmUser(null);
      return;
    }

    try {
      setIsSubmittingStatus(true);
      const targetNewStatus = !statusConfirmUser.isActive;
      const res = await userService.updateUserStatus(statusConfirmUser.id, targetNewStatus);

      addToast({
        type: 'success',
        title: targetNewStatus ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan',
        message: res.message || `Status akun "${statusConfirmUser.name}" berhasil diubah.`,
      });

      // Update state locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === statusConfirmUser.id ? { ...u, isActive: targetNewStatus } : u
        )
      );
      setStatusConfirmUser(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Mengubah Status',
        message: err.message || 'Terjadi kesalahan sistem saat memperbarui status.',
      });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Open Password Modal
  const handleOpenPasswordModal = (targetUser: AdminUserItem) => {
    setPasswordModalUser(targetUser);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError('');
  };

  // Submit Password Change
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      setPasswordError('');
      const res = await userService.changeUserPassword(passwordModalUser.id, newPassword);

      addToast({
        type: 'success',
        title: 'Kata Sandi Diperbarui',
        message: res.message || `Kata sandi akun "${passwordModalUser.name}" berhasil diperbarui.`,
      });

      setPasswordModalUser(null);
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal memperbarui kata sandi pengguna.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const getRoleLabel = (r: Role) => {
    switch (r) {
      case 'ADMIN':
        return 'Admin Global';
      case 'MANAGER':
        return 'Manajer Warung';
      case 'CASHIER':
        return 'Staf Kasir';
      default:
        return r;
    }
  };

  const getRoleBadgeClasses = (r: Role) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'MANAGER':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'CASHIER':
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Manajemen User Multi-Tenant
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola status aktivasi dan perbarui kata sandi seluruh pengguna dari semua tenan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchUsers(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Permission & Security Notice Banner */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Kebijakan Otoritas Pengguna Global (Admin)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">
              Role: ADMIN
            </span>
          </div>
          <p className="leading-relaxed text-slate-500 dark:text-slate-400">
            Sebagai Administrator, Anda memiliki kendali keamanan untuk <strong>menonaktifkan akun</strong> (memutus akses langsung) dan <strong>mengubah kata sandi</strong> bagi pengguna di seluruh warung. Sesuai ketentuan hak akses, <em>penambahan dan penghapusan pengguna tidak diizinkan di halaman ini</em> (pembuatan dan penghapusan staf kasir menjadi wewenang mandiri manajer masing-masing tenan).
          </p>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pengguna</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {stats.total} <span className="text-xs font-normal text-slate-400">user</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pengguna Aktif</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.active} <span className="text-xs font-normal text-slate-400">user</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Dinonaktifkan</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {stats.inactive} <span className="text-xs font-normal text-slate-400">user</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tenan</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {stats.uniqueTenants} <span className="text-xs font-normal text-slate-400">warung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, tenan..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter using Radix UI Select */}
          <div>
            <Select.Root value={roleFilter} onValueChange={setRoleFilter}>
              <Select.Trigger
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                aria-label="Filter berdasarkan Role"
              >
                <div className="flex items-center gap-2 truncate">
                  <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Select.Value placeholder="Pilih Role">
                    {roleFilter === 'ALL' && 'Semua Role'}
                    {roleFilter === 'ADMIN' && 'Admin Global'}
                    {roleFilter === 'MANAGER' && 'Manajer Warung'}
                    {roleFilter === 'CASHIER' && 'Staf Kasir'}
                  </Select.Value>
                </div>
                <Select.Icon className="text-slate-400 shrink-0 ml-1">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 animate-in fade-in-50 zoom-in-95 text-xs"
                >
                  <Select.Viewport>
                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Semua Role</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="ADMIN"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Admin Global (ADMIN)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="MANAGER"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Manajer Warung (MANAGER)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="CASHIER"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Staf Kasir (CASHIER)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Tenant Filter using Radix UI Select */}
          <div>
            <Select.Root value={tenantFilter} onValueChange={setTenantFilter}>
              <Select.Trigger
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                aria-label="Filter berdasarkan Tenan"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Select.Value placeholder="Pilih Tenan">
                    {tenantFilter === 'ALL' && 'Semua Tenan / Warung'}
                    {tenantFilter === 'GLOBAL_ADMIN' && 'Sistem Global (Admin)'}
                    {tenantOptions.find((t) => t.id === tenantFilter)?.name}
                  </Select.Value>
                </div>
                <Select.Icon className="text-slate-400 shrink-0 ml-1">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 min-w-[200px] max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 animate-in fade-in-50 zoom-in-95 text-xs"
                >
                  <Select.Viewport>
                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Semua Tenan / Warung</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="GLOBAL_ADMIN"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Sistem Global (Admin)</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    {tenantOptions.map((tOpt) => (
                      <Select.Item
                        key={tOpt.id}
                        value={tOpt.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                      >
                        <Select.ItemText>{tOpt.name}</Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="w-3.5 h-3.5 text-purple-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Status Filter using Radix UI Select */}
          <div>
            <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
              <Select.Trigger
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                aria-label="Filter berdasarkan Status"
              >
                <div className="flex items-center gap-2 truncate">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <Select.Value placeholder="Pilih Status">
                    {statusFilter === 'ALL' && 'Semua Status'}
                    {statusFilter === 'ACTIVE' && 'Akun Aktif'}
                    {statusFilter === 'INACTIVE' && 'Dinonaktifkan'}
                  </Select.Value>
                </div>
                <Select.Icon className="text-slate-400 shrink-0 ml-1">
                  <ChevronDown className="w-3.5 h-3.5" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 min-w-[170px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 animate-in fade-in-50 zoom-in-95 text-xs"
                >
                  <Select.Viewport>
                    <Select.Item
                      value="ALL"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Semua Status</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="ACTIVE"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Akun Aktif</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item
                      value="INACTIVE"
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer outline-hidden select-none data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800"
                    >
                      <Select.ItemText>Dinonaktifkan</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        {/* Reset filter button if any active */}
        {(searchQuery || roleFilter !== 'ALL' || tenantFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Menampilkan {filteredUsers.length} dari {users.length} pengguna
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setTenantFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data seluruh pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Tidak ada pengguna ditemukan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || roleFilter !== 'ALL' || tenantFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Tidak ada data pengguna yang cocok dengan kriteria filter saat ini.'
                : 'Belum ada pengguna yang terdaftar di dalam sistem.'}
            </p>
            {(searchQuery || roleFilter !== 'ALL' || tenantFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setTenantFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                  <th className="py-3 px-4 sm:px-6">Pengguna</th>
                  <th className="py-3 px-4">Tenan / Warung</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Terdaftar</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredUsers.map((u) => {
                  const isCurrentAdmin = currentUser?.id === u.id;
                  const initials = (u.name || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0].toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                                : u.role === 'MANAGER'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5">
                              <span>{u.email}</span>
                              {u.phone && u.phone !== '-' && (
                                <>
                                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                                  <span>{u.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tenant Info */}
                      <td className="py-3.5 px-4">
                        {u.tenantId ? (
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-medium truncate max-w-[180px]">{u.tenantName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-xs font-medium">Sistem Global (Admin)</span>
                          </div>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${getRoleBadgeClasses(
                            u.role
                          )}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                            <span>Aktif</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                            <span>Dinonaktifkan</span>
                          </div>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions: ONLY Ubah Password & Toggle Active. NO Add, NO Delete! */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Ubah Password Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                            title={`Ubah kata sandi ${u.name}`}
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            <span>Ubah Sandi</span>
                          </button>

                          {/* Toggle Status Button */}
                          <button
                            type="button"
                            onClick={() => setStatusConfirmUser(u)}
                            disabled={isCurrentAdmin && u.isActive}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/50'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/50'
                            }`}
                            title={
                              isCurrentAdmin && u.isActive
                                ? 'Anda tidak dapat menonaktifkan akun sendiri'
                                : u.isActive
                                ? `Nonaktifkan akun ${u.name}`
                                : `Aktifkan akun ${u.name}`
                            }
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Nonaktifkan</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Aktifkan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Ubah Kata Sandi */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingPassword && setPasswordModalUser(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Ubah Kata Sandi Pengguna
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atur kata sandi baru untuk akun terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingPassword && setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Detail Box */}
            <div className="my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Nama Pengguna:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{passwordModalUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{passwordModalUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Tenan / Warung:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{passwordModalUser.tenantName || 'Sistem Global'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Peran:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{getRoleLabel(passwordModalUser.role)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Kata Sandi Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-9 pr-10 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kata Sandi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Status Akun (Aktifkan / Nonaktifkan) */}
      {statusConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmittingStatus && setStatusConfirmUser(null)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 overflow-hidden z-10 animate-in fade-in-90 zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  statusConfirmUser.isActive
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400'
                }`}
              >
                {statusConfirmUser.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {statusConfirmUser.isActive ? 'Nonaktifkan Akun Pengguna?' : 'Aktifkan Kembali Akun Pengguna?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {statusConfirmUser.name} ({statusConfirmUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {statusConfirmUser.isActive ? (
                <>
                  Apakah Anda yakin ingin menonaktifkan akun <strong>{statusConfirmUser.name}</strong> pada tenan{' '}
                  <strong>{statusConfirmUser.tenantName || 'Sistem Global'}</strong>? Pengguna ini tidak akan dapat login atau melakukan transaksi lagi sampai akun diaktifkan kembali.
                </>
              ) : (
                <>
                  Aktifkan kembali akun <strong>{statusConfirmUser.name}</strong> pada tenan{' '}
                  <strong>{statusConfirmUser.tenantName || 'Sistem Global'}</strong>? Pengguna akan dapat login kembali ke aplikasi POS KasirWarung.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                disabled={isSubmittingStatus}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={isSubmittingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                  statusConfirmUser.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmittingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>{statusConfirmUser.isActive ? 'Ya, Nonaktifkan Akun' : 'Ya, Aktifkan Akun'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
