import { getClient } from './client';
import type { RegisterRequest, LoginRequest, BrowserSessionResponse, MobileAuthResponse } from '@dating/types';

export const authApi = {
  register: (data: RegisterRequest) =>
    getClient().post<void>('/api/auth/register', JSON.stringify(data)),
  login: (data: LoginRequest) =>
    getClient().post<BrowserSessionResponse>('/api/auth/login', JSON.stringify(data)),
  mobileLogin: (data: LoginRequest) =>
    getClient().post<MobileAuthResponse>('/api/auth/mobile/login', JSON.stringify(data)),
  mobileRefresh: (refreshToken: string) =>
    getClient().post<MobileAuthResponse>('/api/auth/mobile/refresh', JSON.stringify(refreshToken)),
  session: () => getClient().get<BrowserSessionResponse>('/api/auth/session'),
  logout: () => getClient().post<void>('/api/auth/logout', JSON.stringify({})),
};
