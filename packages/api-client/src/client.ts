export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message || `Request failed with status ${status}.`);
    this.name = 'ApiError';
  }
}

type RequestBody = BodyInit | null | undefined;

type RequestOptions = {
  body?: RequestBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type ApiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T>;
  post<T>(path: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>): Promise<T>;
  put<T>(path: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>): Promise<T>;
  delete<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T>;
};

let client: ApiClient | undefined;
let currentBaseUrl = '';
let authToken: string | null = null;

function resolveStorageToken(): string | null {
  try {
    const raw = localStorage.getItem('masquerade-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  try {
    localStorage.removeItem('masquerade-auth');
  } catch { }

  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const isAuthPage = path === '/login' || path === '/register';
    if (!isAuthPage) {
      window.location.href = '/login';
    }
  }
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!currentBaseUrl) throw new Error('API client not initialized.');

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = authToken ?? resolveStorageToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${currentBaseUrl}${path}`, {
    method,
    headers,
    body: options.body,
    signal: options.signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(response.status, message);
  }

  return parseResponseBody<T>(response);
}

export function createApiClient(baseURL: string): ApiClient {
  currentBaseUrl = baseURL;
  client = {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };

  return client;
}

export function setAuthToken(token: string | null) {
  if (!client) throw new Error('API client not initialized.');
  authToken = token;
}

export function getClient(): ApiClient {
  if (!client) throw new Error('API client not initialized.');
  return client;
}
