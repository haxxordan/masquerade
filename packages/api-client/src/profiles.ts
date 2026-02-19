import { getClient } from './client';
import type { Profile, CreateProfileRequest, SuggestQuery } from '@dating/types';

// What we actually send to the API (layout as string)
interface CreateProfilePayload extends Omit<CreateProfileRequest, 'layout'> {
  layoutJson: string;
}

export const profilesApi = {
  get: (id: string) =>
    getClient().get<Profile>(`/api/profiles/${id}`).then(r => r.data),

  create: (data: CreateProfileRequest) => {
    const payload: CreateProfilePayload = {
      ...data,
      layoutJson: JSON.stringify(data.layout),
    };
    return getClient().post<Profile>('/api/profiles', payload).then(r => r.data);
  },

  update: (id: string, data: Partial<CreateProfileRequest>) =>
    getClient().put<Profile>(`/api/profiles/${id}`, data).then(r => r.data),

  suggest: (query: SuggestQuery) =>
    getClient().post<Profile[]>('/api/profiles/suggest', query).then(r => r.data),
};
