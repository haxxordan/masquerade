"use client";

import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminDashboardSummary, AdminLikeDetail, AdminMatchDetail, AdminUserDetail, AdminUserListItem } from '@dating/types';
import { adminApi } from '@/lib/adminApi';
import { clearAdminSession, getStoredAdminSession } from '@/lib/adminAuth';

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function renderIdentity(user: { email: string; displayName: string | null; animalType: string | null }) {
  if (user.displayName) {
    return `${user.displayName} (${user.email})`;
  }

  return user.email;
}

function LikesSection({ title, items }: { title: string; items: AdminLikeDetail[] }) {
  return (
    <section className="glass-panel detail-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="detail-empty">No records.</p>
      ) : (
        <ul className="detail-list">
          {items.map((item) => (
            <li key={`${item.otherUser.userId}-${item.createdAt}`}>
              <div className="detail-meta">
                <strong>{renderIdentity(item.otherUser)}</strong>
                <span className="subtle-badge">{formatDate(item.createdAt)}</span>
              </div>
              <p className="muted">
                {item.otherUser.animalType ? `Animal: ${item.otherUser.animalType}` : 'No profile animal set.'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MatchesSection({ items }: { items: AdminMatchDetail[] }) {
  return (
    <section className="glass-panel detail-section">
      <h3>Matches</h3>
      {items.length === 0 ? (
        <p className="detail-empty">No matches.</p>
      ) : (
        <ul className="detail-list">
          {items.map((item) => (
            <li key={item.matchId}>
              <div className="detail-meta">
                <strong>{renderIdentity(item.otherUser)}</strong>
                <span className="badge">{item.status}</span>
              </div>
              <p className="muted">Created {formatDate(item.createdAt)}</p>
              <div className="badge-row">
                <span className="subtle-badge">Messages: {item.messageCount}</span>
                {item.otherUser.animalType ? <span className="subtle-badge">{item.otherUser.animalType}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const visibleUsers = users.filter((user) => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [user.email, user.displayName ?? '', user.animalType ?? '', user.gender ?? '', user.lookingFor ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  useEffect(() => {
    if (!getStoredAdminSession()) {
      router.replace('/');
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const [summaryResponse, usersResponse] = await Promise.all([
          adminApi.getSummary(),
          adminApi.getUsers(),
        ]);

        if (ignore) {
          return;
        }

        setSummary(summaryResponse);
        setUsers(usersResponse);
        startTransition(() => {
          setSelectedUserId(usersResponse[0]?.userId ?? null);
        });
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard.');
        }
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    let ignore = false;
    setIsLoadingDetail(true);

    adminApi.getUserDetail(selectedUserId)
      .then((response) => {
        if (!ignore) {
          setSelectedUser(response);
        }
      })
      .catch((detailError) => {
        if (!ignore) {
          setError(detailError instanceof Error ? detailError.message : 'Failed to load user detail.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedUserId]);

  function handleLogout() {
    clearAdminSession();
    router.replace('/');
  }

  return (
    <main className="admin-shell dashboard-grid">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">Admin dashboard</div>
          <h1 style={{ margin: 0, fontSize: '3rem' }}>Users, likes, and matches</h1>
          <p className="muted">Operator-only visibility with a separate auth boundary.</p>
        </div>

        <button className="ghost-button" type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {error ? <div className="error-text">{error}</div> : null}

      <section className="summary-grid">
        {[
          { label: 'Users', value: summary?.totalUsers ?? '...' },
          { label: 'Profiles', value: summary?.totalProfiles ?? '...' },
          { label: 'Likes', value: summary?.totalLikes ?? '...' },
          { label: 'Matches', value: summary?.totalMatches ?? '...' },
          { label: 'Messages', value: summary?.totalMessages ?? '...' },
        ].map((item) => (
          <article key={item.label} className="glass-panel summary-card">
            <p className="panel-title muted">{item.label}</p>
            <div className="summary-value">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="main-grid">
        <aside className="glass-panel users-panel">
          <div className="row-title">
            <div>
              <h2 style={{ margin: 0 }}>Accounts</h2>
              <p className="muted">Search by email, display name, animal, or preference.</p>
            </div>
            <span className="subtle-badge">{visibleUsers.length} shown</span>
          </div>

          <input
            className="search-input"
            placeholder="Filter users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="users-list">
            {isBootstrapping ? (
              <p className="muted">Loading users...</p>
            ) : visibleUsers.length === 0 ? (
              <p className="muted">No users match the current filter.</p>
            ) : (
              visibleUsers.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  className={`user-row ${selectedUserId === user.userId ? 'active' : ''}`}
                  onClick={() => setSelectedUserId(user.userId)}
                >
                  <div className="row-title">
                    <strong>{user.displayName ?? user.email}</strong>
                    {user.hasProfile ? <span className="badge">Profile ready</span> : <span className="subtle-badge">No profile</span>}
                  </div>
                  <p className="muted">{user.email}</p>
                  <div className="badge-row">
                    <span className="subtle-badge">Sent {user.likesSent}</span>
                    <span className="subtle-badge">Received {user.likesReceived}</span>
                    <span className="subtle-badge">Matches {user.matchesCount}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="glass-panel detail-panel">
          {!selectedUser ? (
            <div>
              <h2 style={{ marginTop: 0 }}>User detail</h2>
              <p className="muted">Select an account to inspect likes and matches.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <h2 style={{ margin: 0 }}>{selectedUser.displayName ?? selectedUser.email}</h2>
                  <p className="muted">{selectedUser.email}</p>
                  <div className="detail-tags">
                    {selectedUser.hasProfile ? <span className="badge">Profile live</span> : <span className="subtle-badge">No profile</span>}
                    {selectedUser.animalType ? <span className="subtle-badge">{selectedUser.animalType}</span> : null}
                    {selectedUser.gender ? <span className="subtle-badge">{selectedUser.gender}</span> : null}
                    {selectedUser.lookingFor ? <span className="subtle-badge">Looking for {selectedUser.lookingFor}</span> : null}
                  </div>
                </div>

                <div className="badge-row">
                  <span className="subtle-badge">User ID {selectedUser.userId.slice(0, 8)}...</span>
                  {selectedUser.profileCreatedAt ? <span className="subtle-badge">Profile {formatDate(selectedUser.profileCreatedAt)}</span> : null}
                </div>
              </div>

              {isLoadingDetail ? <p className="muted">Refreshing detail...</p> : null}

              <div className="detail-section-grid">
                <LikesSection title="Likes sent" items={selectedUser.likesSent} />
                <LikesSection title="Likes received" items={selectedUser.likesReceived} />
                <MatchesSection items={selectedUser.matches} />
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}