import { create } from 'zustand';
import { User, Tenant } from '../types';

interface TokenMeta {
  jti?: string;
  remainingSeconds?: number;
  shouldRefresh?: boolean;
  idleTimeoutMinutes?: number;
  idleTimeoutSeconds?: number;
}

interface AuthStore {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  tenant: Tenant | null;
  tokenMeta: TokenMeta | null;
  idleTimeoutMinutes: number;
  isLoading: boolean;
  error: string | null;
  setAuth: (token: string, user: User, tenant?: Tenant, refreshToken?: string) => void;
  logout: (reason?: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshTokenIfExpiring: () => Promise<void>;
  setIdleTimeoutMinutes: (minutes: number) => void;
}

const LOCAL_STORAGE_TOKEN_KEY = 'kasirwarung_jwt_token';
const LOCAL_STORAGE_REFRESH_TOKEN_KEY = 'kasirwarung_jwt_refresh_token';

// Read default idle timeout from environment variable if set, fallback to 5 minutes
const ENV_IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES || 5);
const DEFAULT_IDLE_TIMEOUT_MINUTES = !isNaN(ENV_IDLE_MINUTES) && ENV_IDLE_MINUTES > 0 ? ENV_IDLE_MINUTES : 5;

// Helper to decode JWT exp client-side quickly without external lib
function getJwtRemainingSeconds(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(0, parsed.exp - nowSec);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY),
  refreshToken: localStorage.getItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY),
  user: null,
  tenant: null,
  tokenMeta: null,
  idleTimeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
  isLoading: true,
  error: null,

  setIdleTimeoutMinutes: (minutes: number) => {
    if (minutes > 0) {
      set({ idleTimeoutMinutes: minutes });
    }
  },

  setAuth: (token: string, user: User, tenant?: Tenant, refreshToken?: string) => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY, refreshToken);
    }
    const rem = getJwtRemainingSeconds(token);
    set({
      token,
      refreshToken: refreshToken || get().refreshToken,
      user,
      tenant: tenant || null,
      error: null,
      tokenMeta: {
        ...get().tokenMeta,
        remainingSeconds: rem ?? undefined,
        shouldRefresh: rem !== null ? rem < 60 : false,
      },
    });
  },

  logout: async (reason?: string) => {
    const currentToken = get().token;
    if (currentToken) {
      try {
        // Inform backend so token's jti is added to the Token Denylist with a TTL matching expiration
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }).catch(() => {});
      } catch (err) {
        console.warn('Logout API error:', err);
      }
    }

    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
    set({
      token: null,
      refreshToken: null,
      user: null,
      tenant: null,
      tokenMeta: null,
      error: null,
    });
  },

  refreshTokenIfExpiring: async () => {
    const currentToken = get().token;
    const currentRefreshToken = get().refreshToken;
    if (!currentToken) return;

    // Check token remaining time
    const remainingSec = getJwtRemainingSeconds(currentToken);
    
    // When remaining time is less than 1 minute (60 seconds), refresh token from backend
    if (remainingSec !== null && remainingSec < 60) {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            refreshToken: currentRefreshToken || undefined,
            allowExpired: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
            if (data.refreshToken) {
              localStorage.setItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY, data.refreshToken);
            }
            const newRem = getJwtRemainingSeconds(data.token);
            set({
              token: data.token,
              refreshToken: data.refreshToken || get().refreshToken,
              user: data.user,
              tokenMeta: {
                ...get().tokenMeta,
                remainingSeconds: newRem ?? undefined,
                shouldRefresh: false,
              },
            });
            console.log('🔄 Token successfully refreshed automatically from backend (remaining time was < 1 min)');
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token is denylisted or invalid
          get().logout('TOKEN_REVOKED');
        }
      } catch (err) {
        console.warn('Failed to refresh expiring token:', err);
      }
    } else if (remainingSec !== null) {
      set({
        tokenMeta: {
          ...get().tokenMeta,
          remainingSeconds: remainingSec,
          shouldRefresh: remainingSec < 60,
        },
      });
    }
  },

  refreshMe: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false, user: null });
      return;
    }

    // Check if token needs refresh before calling me
    const rem = getJwtRemainingSeconds(token);
    if (rem !== null && rem < 60) {
      await get().refreshTokenIfExpiring();
    }

    const activeToken = get().token;
    if (!activeToken) {
      set({ isLoading: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const serverIdleMinutes = data.tokenMeta?.idleTimeoutMinutes;
        set({
          user: data.user,
          tenant: data.tenant,
          tokenMeta: data.tokenMeta,
          idleTimeoutMinutes: typeof serverIdleMinutes === 'number' && serverIdleMinutes > 0 ? serverIdleMinutes : get().idleTimeoutMinutes,
          isLoading: false,
          error: null,
        });

        // If backend reports shouldRefresh, execute refresh immediately
        if (data.tokenMeta?.shouldRefresh) {
          await get().refreshTokenIfExpiring();
        }
      } else {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
        set({ token: null, refreshToken: null, user: null, tenant: null, tokenMeta: null, isLoading: false });
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      set({ isLoading: false });
    }
  },
}));
