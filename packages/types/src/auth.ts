export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface BrowserSessionResponse {
  email: string;
}

export interface MobileAuthResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  accessExpiresAt: string;
}
