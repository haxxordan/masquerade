# Dating Monorepo

## Stack
- **Web**: Next.js 15 (App Router) + Tailwind CSS
- **Mobile**: Expo SDK 52 + React Native + NativeWind
- **Shared**: TypeScript types, API client (axios), Zustand store
- **Backend**: .NET 9 Web API + EF Core + PostgreSQL + SignalR

## Prerequisites
- Node 20+ and npm 10+
- .NET 9 SDK
- PostgreSQL running locally (or Docker)
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for mobile builds): `npm install -g eas-cli`

## Setup

### 1. Install JS dependencies
```bash
npm install
```

### 2. Configure backend
```bash
cd api/DatingApi
# Edit appsettings.Development.json with your DB connection string
dotnet restore
dotnet ef migrations add Init --output-dir Data/Migrations
dotnet ef database update
dotnet run
# API runs at https://localhost:5001
```

### 3. Configure environment variables
```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
# Set NEXT_PUBLIC_API_URL and EXPO_PUBLIC_API_URL to your API address
```

### 4. Run dev servers
```bash
# All at once (web + mobile in parallel):
npm run dev

# Or individually:
cd apps/web && npm run dev        # http://localhost:3000
cd apps/mobile && npx expo start  # Expo dev server (QR code for mobile, w for web)
```

## Project Structure
```
apps/
  web/        Next.js web app
  mobile/     Expo React Native app
packages/
  types/      Shared TypeScript interfaces
  api-client/ Shared Axios API client
  store/      Shared Zustand auth/match stores
api/
  DatingApi/  .NET 9 Web API backend
```
