"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = await authApi.register(form);
    setAuth(auth);
    router.push('/onboarding');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-pink-400">Create Account</h2>
        <input className="bg-gray-800 p-3 rounded-lg text-white" placeholder="Email"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <input className="bg-gray-800 p-3 rounded-lg text-white" type="password" placeholder="Password"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold transition" type="submit">
          Create Account
        </button>
      </form>
    </div>
  );
}
