"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Lobster } from 'next/font/google';
import { useAuthStore } from '@dating/store';
import { useSignalR } from '@/hooks/useSignalR';
import { Toaster } from 'sonner';

function SignalRProvider() {
    useSignalR();
    return null;
}

const lobster = Lobster({ weight: '400', subsets: ['latin'] });

function NavDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { profile, logout } = useAuthStore();

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div ref={ref} className="relative">
            {/* Avatar trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-9 h-9 rounded border-2 overflow-hidden flex items-center justify-center text-lg transition opacity-70 hover:opacity-100"
                style={{ borderColor: '#ff6699' }}
            >
                {profile?.animalAvatarUrl ? (
                    <img
                        src={profile.animalAvatarUrl}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                    />
                ) : '🐾'}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-44 rounded border border-white/10 bg-black/90 backdrop-blur shadow-xl overflow-hidden z-50">
                    {profile && (
                        <div className="px-4 py-2 border-b border-white/10">
                            <div className="text-sm font-semibold text-white truncate">{profile.displayName}</div>
                            <div className="text-xs opacity-40 capitalize truncate">{profile.animalType}</div>
                        </div>
                    )}
                    <Link
                        href="/my-profile"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                    >
                        my profile
                    </Link>
                    <Link
                        href="/browse"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                    >
                        browse
                    </Link>
                    <Link
                        href="/matches"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                    >
                        💖 matches
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-white/5 transition border-t border-white/10"
                    >
                        log out
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SignalRProvider />
            <Toaster
                position="bottom-right"
                theme="dark"
                toastOptions={{
                    style: {
                        background: '#111',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontFamily: 'monospace',
                    },
                }}
            />
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur border-b border-white/10">
                <Link
                    href="/browse"
                    className={`${lobster.className} text-xl text-[#ff6699] opacity-70 hover:opacity-100 transition`}
                >
                    masquerade
                </Link>
                <NavDropdown />
            </nav>
            <div className="pt-14">
                {children}
            </div>
        </>
    );
}
