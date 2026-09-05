import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy as adminProxy } from './proxy';
import { proxy as webProxy } from '../../web/src/proxy';

afterEach(() => vi.unstubAllEnvs());

it.each([['admin', adminProxy], ['web', webProxy]] as const)('%s emits security headers with an empty same-origin API URL', (_, proxy) => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', '');
  vi.stubEnv('CSP_ENFORCE', 'false');
  const first = proxy(new NextRequest('https://example.test/'));
  const second = proxy(new NextRequest('https://example.test/'));
  const csp = first.headers.get('Content-Security-Policy-Report-Only');
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("'nonce-");
  expect(csp).not.toBe(second.headers.get('Content-Security-Policy-Report-Only'));
  expect(first.headers.get('X-Frame-Options')).toBe('DENY');
  expect(first.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(first.headers.get('Content-Security-Policy')).toBeNull();
});
