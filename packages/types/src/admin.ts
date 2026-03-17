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

export interface AdminFunnelMetrics {
  matchedCount: number;
  firstMessagedCount: number;
  firstRepliedCount: number;
  staleChatCount: number;
  nudgesSentCount: number;
}

export interface AdminDailyFunnelPoint {
  date: string;
  newMatches: number;
  firstMessages: number;
  firstReplies: number;
  nudgesSent: number;
}

export type AdminReportReason = 'Spam' | 'Harassment' | 'FakeProfile' | 'Other';

export interface AdminReport {
  id: string;
  reason: AdminReportReason;
  details: string | null;
  reporterId: string;
  reporterEmail: string | null;
  reportedId: string;
  reportedEmail: string | null;
  createdAt: string;
  isReviewed: boolean;
  reviewedAt: string | null;
  adminNote: string | null;
}