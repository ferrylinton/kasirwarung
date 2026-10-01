import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user,
    token,
    tenant,
    tokenMeta,
    idleTimeoutMinutes,
    isLoading,
    error,
    setAuth,
    updateUser,
    logout,
    refreshTokenIfExpiring,
    refreshMe,
    setIdleTimeoutMinutes,
  } = useAuthStore();

  const isAuthenticated = Boolean(user && token);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isCashier = user?.role === 'CASHIER';

  return {
    user,
    token,
    tenant,
    tokenMeta,
    idleTimeoutMinutes,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    isManager,
    isCashier,
    setAuth,
    updateUser,
    logout,
    refreshTokenIfExpiring,
    refreshMe,
    setIdleTimeoutMinutes,
  };
}

export default useAuth;
