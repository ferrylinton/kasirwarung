import { useAuthStore } from '../stores/authStore';
import { RequestOptions } from '../types/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${this.baseUrl}${cleanPath}`;
    if (!params) return fullUrl;

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });

    const queryString = query.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  private async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, skipAuth, headers = {}, ...rest } = options;
    const url = this.buildUrl(path, params);

    const token = !skipAuth ? useAuthStore.getState().token : null;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    };

    let res = await fetch(url, {
      headers: requestHeaders,
      ...rest,
    });

    // Handle token refresh & retry on 401 or TOKEN_INVALID
    if (!skipAuth && (res.status === 401 || res.status === 403)) {
      try {
        await useAuthStore.getState().refreshTokenIfExpiring();
        const freshToken = useAuthStore.getState().token;
        if (freshToken && freshToken !== token) {
          requestHeaders.Authorization = `Bearer ${freshToken}`;
          res = await fetch(url, {
            headers: requestHeaders,
            ...rest,
          });
        }
      } catch {
        // Proceed with original response
      }
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : null;

    if (!res.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        (res.status === 403
          ? 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.'
          : res.status === 401
          ? 'Sesi berakhir. Silakan login kembali.'
          : `Permintaan gagal dengan status ${res.status}`);
      const error: any = new Error(errorMessage);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  public get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient('/api');
export default api;
