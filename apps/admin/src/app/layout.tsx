import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Masquerade Admin',
  description: 'Separate operations portal for Masquerade administrators.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}