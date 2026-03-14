import { getClient } from './client';
import type {
  Match,
  Message,
  OpenerSuggestions,
  ConversationState,
  NudgeResponse,
} from '@dating/types';

export const matchesApi = {
  like: (likeeId: string) =>
    getClient().post<{ matched: boolean; match?: Match }>(`/api/matches/like/${likeeId}`).then(r => r.data),
  unlike: (profileId: string) =>
    getClient().delete(`/api/matches/like/${profileId}`).then(r => r.data),
  getMatches: () =>
    getClient().get<Match[]>('/api/matches').then(r => r.data),
  getMessages: (matchId: string) =>
    getClient().get<Message[]>(`/api/matches/${matchId}/messages`).then(r => r.data),
  getOpeners: (matchId: string) =>
    getClient().get<OpenerSuggestions>(`/api/matches/${matchId}/openers`).then(r => r.data),
  getConversationState: (matchId: string) =>
    getClient().get<ConversationState>(`/api/matches/${matchId}/state`).then(r => r.data),
  sendNudge: (matchId: string) =>
    getClient().post<NudgeResponse>(`/api/matches/${matchId}/nudge`, {}).then(r => r.data),
  sendMessage: (matchId: string, content: string) =>
    getClient().post<Message>(`/api/matches/${matchId}/messages`, { content }).then(r => r.data),
};
