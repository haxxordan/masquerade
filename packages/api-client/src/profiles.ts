import { getClient } from './client';
import type { Profile, CreateProfileRequest, UpdateProfileRequest, SuggestQuery } from '@dating/types';

export const profilesApi = {
  get: (id: string) =>
    getClient().get<Profile>(`/api/profiles/${id}`).then(r => r.data),

  getMe: () =>
    getClient().get<Profile>('/api/profiles/me').then(r => r.data),

  create: (data: CreateProfileRequest) =>
    getClient().post<Profile>('/api/profiles', data).then(r => r.data),

  update: (id: string, data: UpdateProfileRequest) =>
    getClient().put<Profile>(`/api/profiles/${id}`, data).then(r => r.data),

  suggest: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/suggest', query).then(r => r.data),
};
