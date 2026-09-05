# Masquerade

## Stack
- **Web**: Next.js 16 (App Router) + Tailwind CSS
- **Mobile**: Expo SDK 54 + React Native + NativeWind
- **Shared**: TypeScript types, API client, Zustand store
- **Backend**: .NET 10 Web API + EF Core + PostgreSQL + SignalR

## Prerequisites
- Node 22+ and npm 11+
- .NET 10 SDK
- PostgreSQL running locally (or Docker)
- Use the project-local Expo CLI through `npx expo`
- EAS CLI (for mobile builds): `npm install -g eas-cli`

## Setup

### 1. Install JS dependencies
```bash
npm install
```

### 2. Configure backend
```bash
cd api/DatingApi
# Configure ConnectionStrings:Default and Jwt:Key in appsettings.Development.json
# Jwt:Key must be a high-entropy secret of at least 32 bytes.
dotnet restore
dotnet ef database update
dotnet run
# Use the API URL printed by dotnet run in your frontend environment files.
```

### 3. Configure environment variables
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
# Optional admin portal:
cp apps/admin/.env.example apps/admin/.env.local
# Set NEXT_PUBLIC_API_URL and EXPO_PUBLIC_API_URL to your API address
```

### 3a. Configure admin portal credentials
Set these in api/DatingApi/appsettings.Development.json or via environment variables:

```bash
AdminAuth__Email=admin@example.com
AdminAuth__PasswordHash='paste-your-ASP.NET-Core-PasswordHasher-hash-here'
AdminAuth__JwtKey=replace-with-a-long-random-secret
```

The admin portal uses its own login endpoint, JWT scheme, and secure HttpOnly cookies. Plaintext admin passwords are unsupported. See [security deployment notes](docs/security-deployment.md) before deploying, including browser cookie routing and pending admin MFA.

### 4. Run dev servers
```bash
# All at once (web + mobile in parallel):
npm run dev

# Or individually:
cd apps/web && npm run dev        # http://localhost:3000
cd apps/admin && npm run dev      # http://localhost:3001
cd apps/mobile && npx expo start  # Expo dev server (QR code for mobile, w for web)
```

## Manual Pre-Deploy Security Check
If you are deploying manually, run this from the repo root before deploy:

```bash
npm run security:check
```

This runs:
- JS supply-chain checks (`guard:no-axios` + `npm audit` for production deps)
- .NET vulnerable package scan for `api/DatingApi`

## Project Structure
```
apps/
  admin/      Next.js admin portal
  web/        Next.js web app
  mobile/     Expo React Native app
packages/
  types/      Shared TypeScript interfaces
  api-client/ Shared API client
  store/      Shared Zustand auth/match stores
api/
  DatingApi/  .NET 10 Web API backend
```
