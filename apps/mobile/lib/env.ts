const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Add apps/mobile/.env or set the variable before starting Expo.'
  );
}

export const apiUrl = rawApiUrl.replace(/\/$/, '');
