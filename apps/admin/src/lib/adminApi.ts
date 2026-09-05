import type {
  AdminEngagementTrends,
  AdminAuthResponse,
  AdminDashboardSummary,
  AdminDailyFunnelPoint,
  AdminFeatureFlags,
  AdminFunnelMetrics,
  AdminLoginRequest,
  AdminReport,
  AdminUserDetail,
  AdminUserListItem,
} from '@dating/types';
import { clearAdminSession } from './adminAuth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(init.method ?? 'GET') && typeof document !== 'undefined') {
    const csrf = document.cookie.split('; ').find(cookie => cookie.startsWith('__Host-masq-admin-csrf='))?.split('=').slice(1).join('=');
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf));
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
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

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const adminApi = {
  login: (data: AdminLoginRequest) =>
    request<AdminAuthResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => request<void>('/api/admin/auth/logout', { method: 'POST' }),

  session: () => request<AdminAuthResponse>('/api/admin/auth/session'),

  getSummary: () => request<AdminDashboardSummary>('/api/admin/summary'),

  getFeatureFlags: () => request<AdminFeatureFlags>('/api/admin/feature-flags'),

  getUsers: () => request<AdminUserListItem[]>('/api/admin/users'),

  getUserDetail: (userId: string) => request<AdminUserDetail>(`/api/admin/users/${userId}`),

  getFunnelMetrics: () => request<AdminFunnelMetrics>('/api/admin/metrics/funnel'),

  getEngagementMetrics: () => request<AdminFunnelMetrics>('/api/admin/metrics/engagement'),

  getDailyMetrics: () => request<AdminDailyFunnelPoint[]>('/api/admin/metrics/daily'),

  getEngagementTrends: (days = 30, granularity: 'daily' | 'weekly' = 'daily') =>
    request<AdminEngagementTrends>(`/api/admin/metrics/trends?days=${days}&granularity=${granularity}`),

  getReports: () => request<AdminReport[]>('/api/admin/reports'),

  reviewReport: (reportId: string, adminNote?: string) =>
    request<void>(`/api/admin/reports/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify({ adminNote: adminNote ?? null }),
    }),
};
