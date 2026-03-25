import type { AuthResponse, Profile } from '@dating/types';
import { setAuthToken } from '@dating/api-client';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthResponse) => void;
  setProfile: (profile: Profile) => void;
  logout: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => { },
  removeItem: () => { },
};

const storage = createJSONStorage(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return noopStorage;
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'masquerade-auth',
      storage,
    }
  )
);

