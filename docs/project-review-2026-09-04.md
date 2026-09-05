# Project review — September 4, 2026

Reviewed the working tree, including the existing uncommitted security changes.
Those changes were preserved. No deployment, database migration, or commit was performed.
This was a source/build/test review, not a production penetration test.

**Implemented in this review**

- Removed the known admin JWT fallback key and reject admin authentication when
  configuration is incomplete. Admin signing and validation now both use UTF-8.
- Moved both Next.js security proxies alongside `src/app`, where Next actually
  discovers them. The previous root-level files were silently omitted from the
  production build. Pages now render dynamically so their script nonces match
  the response policy. This changes pages from static to per-request rendering.
- Fixed empty API URLs for same-origin deployments, including session refresh
  and CSP construction; aligned the web SignalR URL fallback with the API client.
- Browser session hydration and logout can renew an expired access token.
  Concurrent requests within one tab share a refresh, and late responses from
  the previous session retry without replaying the old refresh token.
- CSRF protection includes refresh-only cookies and chooses the cookie family
  by endpoint, so simultaneous user/admin sessions do not select the wrong token.
- Added admin cookie logout. Web and admin UIs wait for successful API logout and
  show an error on failure. Admin logout clears cookies; it does not revoke an
  already copied admin JWT.
- Corrected frontend Docker workspace manifest copies, preserved nested workspace
  dependencies, and put public assets beside each standalone app's server.
- Excluded development backend settings and build output from Docker context;
  ignored local environment overrides; updated stale setup instructions and
  documented cookie routing and destructive migration behavior.
- Added seven backend CSRF cases and ten frontend cases covering refresh,
  same-origin configuration, logout, and security headers.

**Remaining priorities**

| Priority | Finding and consequence | Concrete next step |
| --- | --- | --- |
| P1 | `SessionService.RotateAsync` reads and updates without locking or a concurrency token. Two requests can both issue successors, while only one successor remains linked for family revocation. The browser fix does not cover multiple tabs, devices, or direct requests. | Make rotation atomic in PostgreSQL and test parallel refresh/replay against a real database. Decide how legitimate cross-tab refresh is coordinated. |
| P1 | `AuthenticationThrottleService.ConsumeBucketAsync` uses read/increment/save. Concurrent attempts can lose increments or collide on first insert. Identity keys also preserve email case. | Use atomic database upserts/increments, normalize identities, and test bursts. Add retention cleanup for old buckets. |
| P1 | Browser code reads CSRF tokens from `document.cookie`, but `__Host-` cookies from a separate API hostname are inaccessible there. | Route `/api` and `/hubs` through each frontend HTTPS origin, or implement a deliberate cross-origin CSRF token delivery contract. Validate the actual deployment; CORS alone is insufficient. |
| P1 | Mobile sign-out in `apps/mobile/app/(tabs)/profile.tsx` only resets local auth. Its refresh timer also treats transient failures as logout and lacks an app-resume renewal path. | Coordinate mobile refresh centrally, revoke the server session on logout, cancel in-flight refreshes, and clear user-specific query/match caches. Test background/resume and offline behavior on a device. |
| P1 | Existing SignalR connections are authenticated at connection time. Revoking a session does not actively remove an established connection from its user group. | Define and test logout/revocation disconnect behavior, token-expiry handling, and authenticated reconnection. |
| P1 before exposure | Admin remains password-only, and issued admin JWTs have a 12-hour lifetime without session-backed revocation. | Complete the WebAuthn requirement already recorded in `security-deployment.md`; add revocable admin sessions. Cookie deletion alone does not invalidate a copied token. |
| P2 | CSP is report-only by default. Many components use inline `style` attributes, which are incompatible with the current strict `style-src` if enforcement is enabled. No reporting endpoint is configured. | Review actual violations, choose a policy for intentional inline styles, and verify all flows before enabling enforcement. Add collection if the seven-day review is meant to be centralized. |
| P2 | Profile writes accept largely unbounded strings, lists, layout data, and arbitrary avatar URLs. Recreating an existing profile falls through to a unique-index error. | Add request validation and explicit conflict handling, with tests for invalid URLs, oversized input, and duplicate onboarding. |
| P2 | Match-list and admin metrics queries materialize entire message/match collections. Message history is also unpaginated. | Add bounded history pagination and database-side aggregates before traffic/data volume grows. |
| P2 | `npm run lint` fails: the web script still invokes `next lint`. No repository CI workflow was found. | Install/configure a supported linter and automate type checks, tests, builds, and a vulnerability gate that fails on findings. |

The three September migrations must be rehearsed against a restored PostgreSQL
database. The distinct-match migration deletes duplicate/self matches and their
dependent conversation data; its down migration cannot restore those records.
The existing in-memory EF tests do not validate PostgreSQL SQL, constraints,
transactions, or concurrent updates. Verify trusted proxy configuration and
actual observed client IPs as part of that deployment pass.

**Validation**

- All six TypeScript package checks passed.
- Backend: 23 tests passed; frontend/admin runner: 13 tests passed.
- Both Next.js production builds passed and include `Proxy (Middleware)`.
- Live loopback API check: a token signed with the old known fallback key receives
  401; admin logout returns 204 and expires both admin cookies.
- Live production-admin check: CSP/security headers are present and every page
  script nonce matches the response CSP nonce.
- `git diff --check` passed. The banned HTTP-wrapper dependency guard passed.
- `npm run lint` fails as described above. Docker image builds and database
  migrations were not run; Docker socket access was unavailable in the sandbox.
- After explicit user approval, `npm audit --omit=dev --audit-level=high`
  completed against the npm registry: **39 vulnerabilities — 2 low, 17 moderate,
  18 high, and 2 critical**. The command exited 1 because findings exceed the gate.
  These counts include vulnerable dependency chains, not 39 confirmed exploitable
  application paths. Expo brings development/build tooling into its production
  dependency tree, so `--omit=dev` does not mean every finding affects the shipped
  mobile runtime.
- The critical package findings are `shell-quote` and `tar`. High-severity findings
  include Next.js, PostCSS, sharp, undici, ws, and several parsing/build utilities.
  Next.js findings include CSP-nonce XSS and middleware/proxy bypass advisories,
  making framework updates relevant to the security work in this review.
- npm reports compatible fixes for many findings. Its force-fix suggestions also
  include an Expo major upgrade and an expo-router downgrade; these require
  separate compatibility review and mobile regression testing. No dependency
  changes were made by this audit, and `npm audit fix --force` was not run.
- .NET dependency advisories remain unverified.
