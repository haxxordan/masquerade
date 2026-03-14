export type MatchStatus = 'pending' | 'matched' | 'rejected';
export type MessageKind = 'Text' | 'System' | 'Nudge';

export interface Like {
  id: string;
  likerId: string;
  likeeId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  createdAt: string;
  otherProfile?: import('./profile').Profile;
  compatibilityScore?: number;
  compatibilityReasons?: string[];
  lastMessageAt?: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;
  kind?: MessageKind;
  metadataJson?: string;
}

export interface OpenerSuggestions {
  suggestions: string[];
}

export interface ConversationState {
  matchId: string;
  firstMessageAt?: string;
  firstReplyAt?: string;
  lastNudgedAt?: string;
  isStale: boolean;
  canNudge: boolean;
  suggestedNudge: string;
}

export interface NudgeResponse {
  message: Message;
  state: ConversationState;
}
