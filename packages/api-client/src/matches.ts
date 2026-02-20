import { getClient } from './client';
import type { Match, Message } from '@dating/types';

export const matchesApi = {
  like: (likeeId: string) =>
    getClient().post<{ matched: boolean; match?: Match }>(`/api/matches/like/${likeeId}`).then(r => r.data),
  unlike: (profileId: string) =>
    getClient().delete(`/api/matches/like/${profileId}`).then(r => r.data),
  getMatches: () =>
    getClient().get<Match[]>('/api/matches').then(r => r.data),
  getMessages: (matchId: string) =>
    getClient().get<Message[]>(`/api/matches/${matchId}/messages`).then(r => r.data),
  sendMessage: (matchId: string, content: string) =>
    getClient().post<Message>(`/api/matches/${matchId}/messages`, { content }).then(r => r.data),
};
