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
let browserRefresh: Promise<boolean> | undefined;
let sessionGeneration = 0;

function handleUnauthorized() {
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

async function performBrowserRefresh(): Promise<boolean> {
  if (!client || typeof window === 'undefined') return false;
  const refreshHeaders = new Headers();
  const csrf = document.cookie.split('; ').find(cookie => cookie.startsWith('__Host-masq-csrf='))?.split('=').slice(1).join('=');
  if (csrf) refreshHeaders.set('X-CSRF-Token', decodeURIComponent(csrf));
  const response = await fetch(`${currentBaseUrl}/api/auth/refresh`, { method: 'POST', headers: refreshHeaders, credentials: 'include' });
  return response.ok;
}

function refreshBrowserSession(): Promise<boolean> {
  // A rotating token must only be used once, even when several requests expire together.
  browserRefresh ??= performBrowserRefresh().then(ok => {
    if (ok) sessionGeneration++;
    return ok;
  }).finally(() => { browserRefresh = undefined; });
  return browserRefresh;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  if (!client) throw new Error('API client not initialized.');

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  } else if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && typeof document !== 'undefined') {
    const csrf = document.cookie.split('; ').find(cookie => cookie.startsWith('__Host-masq-csrf='))?.split('=').slice(1).join('=');
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf));
  }

  const requestGeneration = sessionGeneration;
  const response = await fetch(`${currentBaseUrl}${path}`, {
    method,
    headers,
    body: options.body,
    signal: options.signal,
    credentials: 'include',
  });

  if (response.status === 401 && !retried && !authToken && (!path.startsWith('/api/auth/') || path === '/api/auth/session' || path === '/api/auth/logout')) {
    if (requestGeneration !== sessionGeneration || await refreshBrowserSession()) {
      return request<T>(method, path, options, true);
    }
  }

  if (response.status === 401 && path !== '/api/auth/session') {
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
