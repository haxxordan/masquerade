"use client";
import { createApiClient } from '@dating/api-client';
import { useEffect } from 'react';

createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001');

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
