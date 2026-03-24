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
    getUsers: vi.fn(),
    getEngagementMetrics: vi.fn(),
    getEngagementTrends: vi.fn(),
    getReports: vi.fn(),
    getUserDetail: vi.fn(),
    reviewReport: vi.fn(),
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
    adminApiMock.getUsers.mockResolvedValue(usersFixture);
    adminApiMock.getEngagementMetrics.mockResolvedValue(engagementFixture);
    adminApiMock.getEngagementTrends.mockResolvedValue(trendsFixture);
    adminApiMock.getReports.mockResolvedValue(reportsFixture);
    adminApiMock.getUserDetail.mockResolvedValue(userDetailFixture);
    adminApiMock.reviewReport.mockResolvedValue(undefined);
  });

  it('renders engagement cards with nudges acted metrics', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Conversation funnel')).toBeInTheDocument();
    expect(screen.getAllByText('Nudges acted').length).toBeGreaterThan(0);
    expect(screen.getByText('66.7% of nudges')).toBeInTheDocument();
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
