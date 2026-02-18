import { getClient } from './client';
import type { RegisterRequest, LoginRequest, AuthResponse } from '@dating/types';

export const authApi = {
  register: (data: RegisterRequest) =>
    getClient().post<AuthResponse>('/api/auth/register', data).then(r => r.data),
  login: (data: LoginRequest) =>
    getClient().post<AuthResponse>('/api/auth/login', data).then(r => r.data),
};
