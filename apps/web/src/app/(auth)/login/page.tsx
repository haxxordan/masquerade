"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, createApiClient } from '@dating/api-client';
import { useAuthStore } from '@dating/store';

createApiClient(process.env.NEXT_PUBLIC_API_URL!);

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const auth = await authApi.login(form);
      setAuth(auth);
      router.push('/browse');
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-pink-400">Sign In</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input className="bg-gray-800 p-3 rounded-lg text-white" placeholder="Email"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <input className="bg-gray-800 p-3 rounded-lg text-white" type="password" placeholder="Password"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition" type="submit">
          Sign In
        </button>
      </form>
    </div>
  );
}
