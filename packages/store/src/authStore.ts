import { create } from 'zustand';
import type { AuthResponse, Profile } from '@dating/types';
import { setAuthToken } from '@dating/api-client';

interface AuthState {
  token: string | null;
  userId: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthResponse) => void;
  setProfile: (profile: Profile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  profile: null,
  isAuthenticated: false,
  setAuth: (auth) => {
    setAuthToken(auth.token);
    set({ token: auth.token, userId: auth.userId, isAuthenticated: true });
  },
  setProfile: (profile) => set({ profile }),
  logout: () => {
    setAuthToken(null);
    set({ token: null, userId: null, profile: null, isAuthenticated: false });
  },
}));
