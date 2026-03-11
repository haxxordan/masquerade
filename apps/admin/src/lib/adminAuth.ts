import type { AdminAuthResponse } from '@dating/types';

const STORAGE_KEY = 'masquerade-admin-auth';

export function getStoredAdminSession(): AdminAuthResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminAuthResponse;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeAdminSession(session: AdminAuthResponse) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function getAdminToken(): string | null {
  return getStoredAdminSession()?.token ?? null;
}