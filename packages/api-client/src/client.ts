import axios, { AxiosInstance } from 'axios';

let client: AxiosInstance;

export function createApiClient(baseURL: string): AxiosInstance {
  client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

  // Read token from localStorage on every request
  client.interceptors.request.use((config) => {
    try {
      const raw = localStorage.getItem('masquerade-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch { }
    return config;
  });

  // Handle auth errors globally
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Clear stored auth state
        try {
          localStorage.removeItem('masquerade-auth');
        } catch { }
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export function setAuthToken(token: string | null) {
  if (!client) throw new Error('API client not initialized.');
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export function getClient(): AxiosInstance {
  if (!client) throw new Error('API client not initialized.');
  return client;
}
