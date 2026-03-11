import type {
  AdminAuthResponse,
  AdminDashboardSummary,
  AdminLoginRequest,
  AdminUserDetail,
  AdminUserListItem,
} from '@dating/types';
import { clearAdminSession, getAdminToken } from './adminAuth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const token = getAdminToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearAdminSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export const adminApi = {
  login: (data: AdminLoginRequest) =>
    request<AdminAuthResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSummary: () => request<AdminDashboardSummary>('/api/admin/summary'),

  getUsers: () => request<AdminUserListItem[]>('/api/admin/users'),

  getUserDetail: (userId: string) => request<AdminUserDetail>(`/api/admin/users/${userId}`),
};