# Production security deployment checklist

This repository enforces application-level controls, but the following values
must be supplied by deployment configuration before enabling the release.

## Required secrets and configuration

- Set `Jwt__Key` to a newly generated, high-entropy signing key. Rotate the
  previous key during deployment so all pre-remediation user tokens are invalid.
- Set `Jwt__Issuer=masquerade-api` and `Jwt__Audience=masquerade-clients` (or
  deployment-specific values used consistently by the API and token issuer).
- Set `AdminAuth__Email`, `AdminAuth__PasswordHash`, `AdminAuth__JwtKey`,
  `AdminAuth__Issuer`, and `AdminAuth__Audience` through the secret manager.
  `PasswordHash` must be an ASP.NET Core `PasswordHasher` hash; plaintext admin
  passwords are deliberately unsupported.
- Set `Cors__AllowedOrigins__0=https://masq.prophecytech.org` and
  `Cors__AllowedOrigins__1=https://masqadmin.prophecytech.org` when the API is
  on a separate origin. Do not use wildcard origins with credentials.
- Keep the API behind trusted Caddy/Cloudflare proxies so forwarded client IPs
  are accurate for authentication throttles.

## Browser routing and migrations

- Prefer exposing `/api/*` and `/hubs/*` through each frontend's HTTPS origin,
  with `NEXT_PUBLIC_API_URL` set to an empty string at build time. The browser
  reads the CSRF cookie from the frontend origin; `__Host-` cookies issued by a
  separate API hostname cannot be read there. CORS alone does not solve this.
- If retaining a separate API hostname, implement and test an explicit CSRF
  token delivery contract before rollout. Do not weaken the host-only cookies.
- Configure trusted proxy addresses/networks explicitly for the actual network
  topology; forwarded headers from arbitrary proxies are not trusted by default.
- Back up PostgreSQL and rehearse the three September migrations on a restored
  copy before release. `EnforceDistinctMatchUsers` deletes self matches and
  duplicate matches, cascading to their messages and conversation state. Its
  down migration cannot recover those records.
- Apply the existing migrations; do not generate a new `Init` migration.

## Edge changes

- In Cloudflare, set the minimum TLS version to 1.2 and retain TLS 1.3.
- Add per-IP rate rules for `/api/auth/*` and `/api/admin/auth/*` as an outer
  layer; application limits remain the authoritative account+IP guard.
- Start with `CSP_ENFORCE=false`, review CSP violations for seven days, then
  set `CSP_ENFORCE=true`. Do not enable `unsafe-eval` in production.
- Enable HSTS with a one-year max age. Add `includeSubDomains` only after every
  covered hostname is confirmed to serve HTTPS; do not preload initially.

## Admin MFA

The password is now cookie-delivered and hash-verified, but a production admin
deployment must add a WebAuthn ceremony before the portal is exposed. The
existing admin cookie contract is intentionally isolated (`__Host-masq-admin-*`)
so the WebAuthn assertion can be inserted between password verification and
cookie issuance without changing dashboard APIs. Do not treat the current
password-only bootstrap as MFA.
