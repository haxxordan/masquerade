import { getClient } from './client';
import type { Profile, CreateProfileRequest, UpdateProfileRequest, SuggestQuery } from '@dating/types';

export type ReportReason = 'Spam' | 'Harassment' | 'FakeProfile' | 'Other';

export const profilesApi = {
  get: (id: string) =>
    getClient().get<Profile>(`/api/profiles/${id}`).then(r => r.data),

  getMe: () =>
    getClient().get<Profile>('/api/profiles/me').then(r => r.data),

  create: (data: CreateProfileRequest) =>
    getClient().post<Profile>('/api/profiles', data).then(r => r.data),

  update: (data: UpdateProfileRequest) =>
    getClient().put<Profile>('/api/profiles/me', data).then(r => r.data),

  suggest: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/suggest', query).then(r => r.data),

  topPicks: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/top-picks', query).then(r => r.data),

  block: (userId: string) =>
    getClient().post(`/api/profiles/${userId}/block`).then(r => r.data),

  unblock: (userId: string) =>
    getClient().delete(`/api/profiles/${userId}/block`).then(r => r.data),

  getBlocked: () =>
    getClient().get<string[]>('/api/profiles/blocked').then(r => r.data),

  report: (userId: string, reason: ReportReason, details?: string) =>
    getClient().post(`/api/profiles/${userId}/report`, { reason, details }).then(r => r.data),
};
