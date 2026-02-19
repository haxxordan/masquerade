"use client";
import { createApiClient, setAuthToken } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useEffect } from 'react';

createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001');

export function Providers({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  return <>{children}</>;
}
