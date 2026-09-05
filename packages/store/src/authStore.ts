import type { BrowserSessionResponse, MobileAuthResponse, Profile } from '@dating/types';
import { setAuthToken } from '@dating/api-client';
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  accessExpiresAt: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setBrowserSession: (session: BrowserSessionResponse) => void;
  setMobileSession: (session: MobileAuthResponse) => void;
  setProfile: (profile: Profile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    (set) => ({
      token: null,
      refreshToken: null,
      accessExpiresAt: null,
      profile: null,
      isAuthenticated: false,
      setBrowserSession: () => {
        setAuthToken(null);
        set({ token: null, refreshToken: null, accessExpiresAt: null, isAuthenticated: true });
      },
      setMobileSession: (session) => {
        setAuthToken(session.accessToken);
        set({ token: session.accessToken, refreshToken: session.refreshToken, accessExpiresAt: session.accessExpiresAt, isAuthenticated: true });
      },
      setProfile: (profile) => set({ profile }),
      logout: () => {
        setAuthToken(null);
        set({ token: null, refreshToken: null, accessExpiresAt: null, profile: null, isAuthenticated: false });
      },
    })
);
