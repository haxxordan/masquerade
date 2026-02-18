export type MatchStatus = 'pending' | 'matched' | 'rejected';

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
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;
}
