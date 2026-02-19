export interface ProfileWidget {
  id: string;
  type: 'about' | 'music' | 'hobbies' | 'top8' | 'blog';
  title: string;
  content: string;
  order: number;
}

export interface ProfileLayout {
  theme: 'dark' | 'retro' | 'ocean' | 'forest';
  accentColor: string;
  widgets: ProfileWidget[];
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  animalAvatarUrl: string;       // Required; must be an animal image
  animalType: string;            // e.g. "red panda", "axolotl"
  musicGenres: string[];
  hobbies: string[];
  faith: string | null;
  politicalLeaning: string | null;
  layout: ProfileLayout;
  createdAt: string;
  likeStatus: 'None' | 'Liked' | 'Matched';
}

export interface CreateProfileRequest {
  displayName: string;
  animalAvatarUrl: string;
  animalType: string;
  musicGenres: string[];
  hobbies: string[];
  faith?: string;
  politicalLeaning?: string;
  layout: ProfileLayout;
}

export interface SuggestQuery {
  musicGenres?: string[];
  hobbies?: string[];
  faith?: string;
  politicalLeaning?: string;
  page?: number;
  pageSize?: number;
}

// Add this helper at the bottom of profile.ts
export function parseLayout(profile: Profile): ProfileLayout {
  try {
    return typeof profile.layout === 'string'
      ? JSON.parse(profile.layout as unknown as string)
      : profile.layout;
  } catch {
    return { theme: 'dark', accentColor: '#ff6699', widgets: [] };
  }
}