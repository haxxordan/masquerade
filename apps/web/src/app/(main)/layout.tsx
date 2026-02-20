"use client";

import Link from 'next/link';
import { Lobster } from 'next/font/google';

const lobster = Lobster({ weight: '400', subsets: ['latin'] });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur border-b border-white/10">
        <Link
          href="/browse"
          className={`${lobster.className} text-xl text-[#ff6699] opacity-70 hover:opacity-100 transition`}
        >
          masquerade
        </Link>
        <Link
          href="/my-profile"
          className={`${lobster.className} text-xl text-[#ff6699] opacity-70 hover:opacity-100 transition`}
        >
          my profile
        </Link>
      </nav>
      <div className="pt-14">
        {children}
      </div>
    </>
  );
}
