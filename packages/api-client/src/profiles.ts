import { getClient } from './client';
import type { Profile, CreateProfileRequest, UpdateProfileRequest, SuggestQuery } from '@dating/types';

export type ReportReason = 'Spam' | 'Harassment' | 'FakeProfile' | 'Other';

export const profilesApi = {
  get: (id: string) =>
    getClient().get<Profile>(`/api/profiles/${id}`),

  getMe: () =>
    getClient().get<Profile>('/api/profiles/me'),

  create: (data: CreateProfileRequest) =>
    getClient().post<Profile>('/api/profiles', JSON.stringify(data)),

  update: (data: UpdateProfileRequest) =>
    getClient().put<Profile>('/api/profiles/me', JSON.stringify(data)),

  suggest: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/suggest', JSON.stringify(query)),

  topPicks: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/top-picks', JSON.stringify(query)),

  block: (profileId: string) =>
    getClient().post<void>(`/api/profiles/${profileId}/block`),

  unblock: (profileId: string) =>
    getClient().delete<void>(`/api/profiles/${profileId}/block`),

  getBlocked: () =>
    getClient().get<string[]>('/api/profiles/blocked'),

  report: (profileId: string, reason: ReportReason, details?: string) =>
    getClient().post<void>(`/api/profiles/${profileId}/report`, JSON.stringify({ reason, details })),
};
