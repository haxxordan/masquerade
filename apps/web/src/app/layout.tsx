import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

// CSP nonces must be generated for each response, including its inline scripts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'masquerade — Find your match',
  description: 'Dating app where your spirit animal speaks for you',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
