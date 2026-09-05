"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import { getStoredAdminSession, storeAdminSession } from '@/lib/adminAuth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredAdminSession()) {
      router.replace('/dashboard');
      return;
    }
    adminApi.session().then((session) => {
      storeAdminSession(session);
      router.replace('/dashboard');
    }).catch(() => { });
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const session = await adminApi.login(form);
      storeAdminSession(session);
      router.replace('/dashboard');
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Login failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-shell">
      <div className="login-grid">
        <section className="glass-panel hero-card">
          <div>
            <div className="eyebrow">Admin access</div>
            <h1 className="hero-title">Control room</h1>
            <p className="hero-copy">
              Review accounts, matches, messaging health, and reports.
            </p>
          </div>

          <p className="muted" style={{ margin: 0 }}>Use your admin credentials to continue.</p>
        </section>

        <section className="glass-panel form-card">
          <div className="eyebrow">Sign in</div>
          <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Admin portal</h2>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Admin email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            <div className="error-text">{error}</div>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
