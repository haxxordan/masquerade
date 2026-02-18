import { create } from 'zustand';
import type { Match, Message } from '@dating/types';

interface MatchState {
  matches: Match[];
  activeMatchId: string | null;
  messages: Record<string, Message[]>;
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  setActiveMatch: (matchId: string | null) => void;
  setMessages: (matchId: string, messages: Message[]) => void;
  addMessage: (matchId: string, message: Message) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  activeMatchId: null,
  messages: {},
  setMatches: (matches) => set({ matches }),
  addMatch: (match) => set((s) => ({ matches: [match, ...s.matches] })),
  setActiveMatch: (matchId) => set({ activeMatchId: matchId }),
  setMessages: (matchId, messages) => set((s) => ({ messages: { ...s.messages, [matchId]: messages } })),
  addMessage: (matchId, message) =>
    set((s) => ({ messages: { ...s.messages, [matchId]: [...(s.messages[matchId] ?? []), message] } })),
}));
