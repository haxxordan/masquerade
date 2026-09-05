import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

const { adminApiMock } = vi.hoisted(() => ({
  adminApiMock: {
    getSummary: vi.fn(),
    getFeatureFlags: vi.fn(),
    getUsers: vi.fn(),
    getEngagementMetrics: vi.fn(),
    getEngagementTrends: vi.fn(),
    getReports: vi.fn(),
    getUserDetail: vi.fn(),
    reviewReport: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/adminAuth', () => ({
  getStoredAdminSession: () => ({ token: 'test-token', email: 'admin@example.com' }),
  clearAdminSession: vi.fn(),
}));

vi.mock('@/lib/adminApi', () => ({
  adminApi: adminApiMock,
}));

const summaryFixture = {
  totalUsers: 10,
  totalProfiles: 9,
  totalLikes: 40,
  totalMatches: 12,
  totalMessages: 80,
};

const usersFixture = [
  {
    userId: 'u1',
    email: 'one@example.com',
    hasProfile: true,
    profileId: 'p1',
    displayName: 'One',
    animalType: 'Fox',
    gender: 'Woman',
    lookingFor: 'Men',
    profileCreatedAt: new Date('2026-03-01T00:00:00Z').toISOString(),
    likesSent: 4,
    likesReceived: 6,
    matchesCount: 3,
  },
];

const userDetailFixture = {
  ...usersFixture[0],
  likesSent: [],
  likesReceived: [],
  matches: [],
};

const engagementFixture = {
  matchedCount: 12,
  firstMessagedCount: 9,
  firstRepliedCount: 6,
  staleChatCount: 2,
  nudgesSentCount: 3,
  nudgesActedCount: 2,
  medianNudgeReplyMinutes: 18,
  firstMessageRatePercent: 75,
  firstReplyRatePercent: 66.67,
  staleChatRatePercent: 22.22,
  nudgeActedRatePercent: 66.67,
};

const trendsFixture = {
  granularity: 'daily' as const,
  windowDays: 30,
  points: [
    {
      periodStart: '2026-03-10',
      newMatches: 2,
      firstMessages: 2,
      firstReplies: 1,
      nudgesSent: 1,
      nudgesActed: 1,
      firstMessageRatePercent: 100,
      firstReplyRatePercent: 50,
      nudgeActedRatePercent: 100,
    },
  ],
};

const reportsFixture = [
  {
    id: 'r1',
    reason: 'Spam' as const,
    details: 'Suspicious behavior',
    reporterId: 'u10',
    reporterEmail: 'reporter@example.com',
    reportedId: 'u11',
    reportedEmail: 'reported@example.com',
    createdAt: new Date('2026-03-20T10:00:00Z').toISOString(),
    isReviewed: false,
    reviewedAt: null,
    adminNote: null,
  },
];

describe('DashboardPage smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    adminApiMock.getSummary.mockResolvedValue(summaryFixture);
    adminApiMock.getFeatureFlags.mockResolvedValue({
      matching: { topPicksV1: false, scoreV2: false },
      messaging: { smartOpenersV1: true, stallNudgesV1: true },
    });
    adminApiMock.getUsers.mockResolvedValue(usersFixture);
    adminApiMock.getEngagementMetrics.mockResolvedValue(engagementFixture);
    adminApiMock.getEngagementTrends.mockResolvedValue(trendsFixture);
    adminApiMock.getReports.mockResolvedValue(reportsFixture);
    adminApiMock.getUserDetail.mockResolvedValue(userDetailFixture);
    adminApiMock.reviewReport.mockResolvedValue(undefined);
  });

  it('waits for server logout before leaving the dashboard', async () => {
    let finishLogout!: () => void;
    adminApiMock.logout.mockImplementationOnce(() => new Promise<void>(resolve => { finishLogout = resolve; }));
    render(<DashboardPage />);
    await screen.findByText('Conversation funnel');
    await userEvent.click(screen.getByRole('button', { name: /log out|sign out|logout/i }));
    expect(mockReplace).not.toHaveBeenCalled();
    finishLogout();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('shows failed logout instead of pretending the session ended', async () => {
    adminApiMock.logout.mockRejectedValueOnce(new Error('offline'));
    render(<DashboardPage />);
    await screen.findByText('Conversation funnel');
    await userEvent.click(screen.getByRole('button', { name: /log out|sign out|logout/i }));
    expect(await screen.findByText('Sign out failed. Please try again.')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders engagement cards with nudges acted metrics', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Conversation funnel')).toBeInTheDocument();
    expect(screen.getAllByText('Nudges acted').length).toBeGreaterThan(0);
    expect(screen.getByText('66.7% of nudges')).toBeInTheDocument();
    expect(screen.getByText('Smart openers: On')).toBeInTheDocument();
    expect(screen.getByText('18.0 min')).toBeInTheDocument();
  });

  it('requests trends again when window and granularity are changed', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await screen.findByText('Conversation funnel');

    const windowSelect = screen.getByLabelText('Window') as HTMLSelectElement;
    const granularitySelect = screen.getByLabelText('Granularity') as HTMLSelectElement;

    await user.selectOptions(windowSelect, '60');
    await user.selectOptions(granularitySelect, 'weekly');

    await waitFor(() => {
      expect(adminApiMock.getEngagementTrends).toHaveBeenCalledWith(60, 'weekly');
    });
  });

  it('marks a report as reviewed from the dashboard list', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    expect(await screen.findByText('1 pending')).toBeInTheDocument();
    const reviewButton = await screen.findByRole('button', { name: 'Mark reviewed' });
    await user.click(reviewButton);

    await waitFor(() => {
      expect(adminApiMock.reviewReport).toHaveBeenCalledWith('r1');
      expect(adminApiMock.reviewReport).toHaveBeenCalledTimes(1);
    });
  });
});
