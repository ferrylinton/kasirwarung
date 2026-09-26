import { create } from 'zustand';
import { User, Tenant } from '../types';

interface AuthStore {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (token: string, user: User, tenant?: Tenant) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const LOCAL_STORAGE_TOKEN_KEY = 'kasirwarung_jwt_token';

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY),
  user: null,
  tenant: null,
  isLoading: true,
  error: null,

  setAuth: (token: string, user: User, tenant?: Tenant) => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
    set({ token, user, tenant: tenant || null, error: null });
  },

  logout: () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    set({ token: null, user: null, tenant: null, error: null });
  },

  refreshMe: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, tenant: data.tenant, isLoading: false, error: null });
      } else {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        set({ token: null, user: null, tenant: null, isLoading: false });
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      set({ isLoading: false });
    }
  },
}));
