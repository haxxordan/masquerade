"use client";
import { authApi, createApiClient } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useEffect } from 'react';

createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001');

export function Providers({ children }: { children: React.ReactNode }) {
  const setBrowserSession = useAuthStore((s) => s.setBrowserSession);

  useEffect(() => {
    authApi.session().then(setBrowserSession).catch(() => { });
  }, [setBrowserSession]);

  return <>{children}</>;
}
