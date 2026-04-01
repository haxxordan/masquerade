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
    getClient().post<{ matched: boolean; match?: Match }>(`/api/matches/like/${likeeId}`),
  unlike: (profileId: string) =>
    getClient().delete<void>(`/api/matches/like/${profileId}`),
  getMatches: () =>
    getClient().get<Match[]>('/api/matches'),
  getMessages: (matchId: string) =>
    getClient().get<Message[]>(`/api/matches/${matchId}/messages`),
  markRead: (matchId: string) =>
    getClient().post<{ readAt: string }>(`/api/matches/${matchId}/read`, JSON.stringify({})),
  getOpeners: (matchId: string) =>
    getClient().get<OpenerSuggestions>(`/api/matches/${matchId}/openers`),
  getConversationState: (matchId: string) =>
    getClient().get<ConversationState>(`/api/matches/${matchId}/state`),
  sendNudge: (matchId: string) =>
    getClient().post<NudgeResponse>(`/api/matches/${matchId}/nudge`, JSON.stringify({})),
  sendMessage: (matchId: string, content: string) =>
    getClient().post<Message>(`/api/matches/${matchId}/messages`, JSON.stringify({ content })),
};
