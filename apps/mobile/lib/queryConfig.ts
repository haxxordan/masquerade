import type { DefaultOptions } from '@tanstack/react-query';

export const queryKeys = {
  browseProfiles: ['browse', 'profiles'] as const,
  matches: ['matches'] as const,
  myProfile: ['profile', 'me'] as const,
  profile: (id: string) => ['profile', id] as const,
};

export const staleTimes = {
  default: 30_000,
  browseProfiles: 30_000,
  matches: 15_000,
  myProfile: 30_000,
  profile: 30_000,
};

export const queryClientDefaultOptions: DefaultOptions = {
  queries: {
    staleTime: staleTimes.default,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  },
};