import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <h1 className="text-6xl font-bold text-pink-400">🐾 Masquerade</h1>
      <p className="text-gray-400 text-xl text-center max-w-md">
        No face photos. Just your favorite animal, your vibe, and your people.
      </p>
      <div className="flex gap-4">
        <Link href="/register" className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-bold transition">
          Get Started
        </Link>
        <Link href="/login" className="border border-pink-500 text-pink-400 hover:bg-pink-500/10 px-8 py-3 rounded-full font-bold transition">
          Sign In
        </Link>
      </div>
    </main>
  );
}
