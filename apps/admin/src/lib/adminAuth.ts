import type { AdminAuthResponse } from '@dating/types';

let currentSession: AdminAuthResponse | null = null;

export function getStoredAdminSession(): AdminAuthResponse | null {
  return currentSession;
}

export function storeAdminSession(session: AdminAuthResponse) {
  currentSession = session;
}

export function clearAdminSession() {
  currentSession = null;
}
