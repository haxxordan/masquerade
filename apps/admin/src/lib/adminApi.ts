import type {
  AdminEngagementTrends,
  AdminAuthResponse,
  AdminDashboardSummary,
  AdminDailyFunnelPoint,
  AdminFunnelMetrics,
  AdminLoginRequest,
  AdminReport,
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

  getSummary: () => request<AdminDashboardSummary>('/api/admin/summary'),

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