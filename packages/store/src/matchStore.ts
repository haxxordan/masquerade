import { create } from 'zustand';
import type { Match, Message } from '@dating/types';

interface MatchState {
  matches: Match[];
  activeMatchId: string | null;
  messages: Record<string, Message[]>;
  unreadMatchIds: Set<string>;
  typingByMatchId: Record<string, boolean>;
  reset: () => void;
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  setActiveMatch: (matchId: string | null) => void;
  setMessages: (matchId: string, messages: Message[]) => void;
  addMessage: (matchId: string, message: Message) => void;
  markRead: (matchId: string) => void;
  clearUnread: () => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  applyReadReceipt: (matchId: string, readAt: string) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  activeMatchId: null,
  messages: {},
  unreadMatchIds: new Set(),
  typingByMatchId: {},
  reset: () => set({
    matches: [],
    activeMatchId: null,
    messages: {},
    unreadMatchIds: new Set(),
    typingByMatchId: {},
  }),
  setMatches: (matches) => set({
    matches,
    unreadMatchIds: new Set(matches.filter(m => m.hasUnread).map(m => m.id)),
  }),
  addMatch: (match) => set((s) => ({ matches: [match, ...s.matches] })),
  removeMatch: (matchId: string) =>
    set((s) => ({
      matches: s.matches.filter(m => m.id !== matchId),
      activeMatchId: s.activeMatchId === matchId ? null : s.activeMatchId,
    })),

  setActiveMatch: (matchId) => set({ activeMatchId: matchId }),
  setMessages: (matchId, messages) =>
    set((s) => ({ messages: { ...s.messages, [matchId]: messages } })),
  addMessage: (matchId, message) =>
    set((s) => ({
      messages: { ...s.messages, [matchId]: [...(s.messages[matchId] ?? []), message] },
      // Only mark unread if this match isn't currently active
      unreadMatchIds: message.isMine || s.activeMatchId === matchId
        ? s.unreadMatchIds
        : new Set([...s.unreadMatchIds, matchId]),
    })),
  markRead: (matchId) =>
    set((s) => {
      const next = new Set(s.unreadMatchIds);
      next.delete(matchId);
      return { unreadMatchIds: next };
    }),
  clearUnread: () => set({ unreadMatchIds: new Set() }),
  setTyping: (matchId, isTyping) =>
    set((s) => ({ typingByMatchId: { ...s.typingByMatchId, [matchId]: isTyping } })),
  applyReadReceipt: (matchId, readAt) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [matchId]: (s.messages[matchId] ?? []).map((message) =>
          message.isMine && !message.readAt
            ? { ...message, readAt }
            : message
        ),
      },
    })),
}));
