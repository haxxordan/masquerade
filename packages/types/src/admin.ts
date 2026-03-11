export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  token: string;
  email: string;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  totalProfiles: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
}

export interface AdminRelatedUser {
  userId: string;
  email: string;
  profileId: string | null;
  displayName: string | null;
  animalType: string | null;
}

export interface AdminLikeDetail {
  createdAt: string;
  otherUser: AdminRelatedUser;
}

export interface AdminMatchDetail {
  matchId: string;
  status: string;
  createdAt: string;
  messageCount: number;
  otherUser: AdminRelatedUser;
}

export interface AdminUserListItem {
  userId: string;
  email: string;
  hasProfile: boolean;
  profileId: string | null;
  displayName: string | null;
  animalType: string | null;
  gender: string | null;
  lookingFor: string | null;
  profileCreatedAt: string | null;
  likesSent: number;
  likesReceived: number;
  matchesCount: number;
}

export interface AdminUserDetail extends Omit<AdminUserListItem, 'likesSent' | 'likesReceived' | 'matchesCount'> {
  likesSent: AdminLikeDetail[];
  likesReceived: AdminLikeDetail[];
  matches: AdminMatchDetail[];
}