import api from './api.ts';
import { User } from '../types/user.ts';

export const authService = {
  getConfig: async () => {
    return api.get<{
      success: boolean;
      idleTimeoutMinutes: number;
      idleTimeoutSeconds: number;
      accessTokenExpires: string;
      refreshTokenExpires: string;
    }>('/auth/config', { skipAuth: true });
  },

  login: async (credentials: { email: string; password: string }) => {
    return api.post<{
      success: boolean;
      message: string;
      token: string;
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', credentials, { skipAuth: true });
  },

  register: async (payload: { tenantName: string; name: string; email: string; password: string }) => {
    return api.post<{
      success: boolean;
      message: string;
      emailSent?: boolean;
      user?: User;
    }>('/auth/register', payload, { skipAuth: true });
  },

  verifyEmail: async (payload: { token: string; code?: string }) => {
    return api.post<{
      success: boolean;
      message: string;
      token: string;
      refreshToken: string;
      user: User;
    }>('/auth/verify-email', payload, { skipAuth: true });
  },

  getMe: async () => {
    return api.get<{
      success: boolean;
      user: User;
      tenant: any;
      tokenMeta: any;
      sessionStatus: any;
    }>('/auth/me');
  },

  logout: async (reason?: string) => {
    return api.post('/auth/logout', { reason });
  },

  changePassword: async (passwords: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    return api.post<{ success: boolean; message: string }>('/auth/change-password', passwords);
  },

  updateProfile: async (profile: { name: string; phone?: string }) => {
    return api.put<{ success: boolean; message: string; user: User }>('/auth/profile', profile);
  },
};

export default authService;
