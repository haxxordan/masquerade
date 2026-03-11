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
    }
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
            <div className="eyebrow">Separate operator surface</div>
            <h1 className="hero-title">Masquerade control room.</h1>
            <p className="hero-copy">
              A dedicated portal for reviewing accounts, mutual matches, and directional likes without mixing
              operator identity into the public dating app.
            </p>
          </div>

          <div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>Users</strong>
                <span className="muted">Scan who exists, who onboarded, and who has no profile yet.</span>
              </div>
              <div className="hero-stat">
                <strong>Likes</strong>
                <span className="muted">Inspect outbound and inbound interest without joining tables by hand.</span>
              </div>
              <div className="hero-stat">
                <strong>Matches</strong>
                <span className="muted">See relationship state and message volume from one place.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel form-card">
          <div className="eyebrow">Admin sign-in</div>
          <h2 style={{ marginTop: 0, fontSize: '2rem' }}>Portal login</h2>
          <p className="muted">This does not use the regular user auth store or endpoints.</p>

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
              {isSubmitting ? 'Signing in...' : 'Enter admin portal'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}