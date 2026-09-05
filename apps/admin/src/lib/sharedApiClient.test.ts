import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApiClient, setAuthToken } from '../../../../packages/api-client/src/client';

let client: ReturnType<typeof createApiClient>;
const fetchMock = vi.fn();
const json = (status = 200) => new Response('{}', { status });

beforeEach(() => {
  client = createApiClient('https://api.example.test');
  setAuthToken(null);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it('supports the empty base URL used by same-origin Docker deployments', async () => {
  client = createApiClient('');
  fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json()).mockResolvedValueOnce(json());
  await client.get('/api/auth/session');
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/auth/session', '/api/auth/refresh', '/api/auth/session',
  ]);
});

it('renews an expired browser session during page hydration', async () => {
  fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json()).mockResolvedValueOnce(json());
  await client.get('/api/auth/session');
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    'https://api.example.test/api/auth/session',
    'https://api.example.test/api/auth/refresh',
    'https://api.example.test/api/auth/session',
  ]);
});

it('shares one rotation across concurrent unauthorized requests', async () => {
  let finishRefresh: ((response: Response) => void) | undefined;
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/refresh')) return new Promise<Response>(resolve => { finishRefresh = resolve; });
    return Promise.resolve(json(finishRefresh ? 200 : 401));
  });
  const requests = [client.get('/api/auth/session'), client.get('/api/auth/session')];
  await vi.waitFor(() => expect(finishRefresh).toBeTypeOf('function'));
  finishRefresh!(json());
  await Promise.all(requests);
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
});

it('does not replay the refresh token for a late response from the old session', async () => {
  let finishLate!: (response: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finishLate = resolve; }))
    .mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json()).mockResolvedValueOnce(json())
    .mockResolvedValueOnce(json());
  const late = client.get('/api/auth/session');
  await client.get('/api/auth/session');
  finishLate(json(401));
  await late;
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
});

it('stops after one refresh when the renewed session is still unauthorized', async () => {
  fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json()).mockResolvedValueOnce(json(401));
  await expect(client.get('/api/auth/session')).rejects.toMatchObject({ status: 401 });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('does not attempt cookie renewal for a mobile bearer session', async () => {
  setAuthToken('mobile-token');
  fetchMock.mockResolvedValueOnce(json(401));
  await expect(client.get('/api/auth/session')).rejects.toMatchObject({ status: 401 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer mobile-token');
});
