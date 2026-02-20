export interface ProfileWidget {
  id: string;
  type: 'about' | 'music' | 'hobbies' | 'top8' | 'blog';
  title: string;
  content: string;
  order: number;
}

export interface ProfileLayout {
  theme: 'riot' | 'jupiter' | 'ocean' | 'sparrow';
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

export interface UpdateProfileRequest {
  displayName?: string;
  animalAvatarUrl?: string;
  animalType?: string;
  musicGenres?: string[];
  hobbies?: string[];
  faith?: string;
  politicalLeaning?: string;
  layout?: ProfileLayout;
}

export interface SuggestQuery {
  musicGenres?: string[];
  hobbies?: string[];
  faith?: string;
  politicalLeaning?: string;
  page?: number;
  pageSize?: number;
}

export const MUSIC_GENRES = [
  'Rock', 'Pop', 'Hip-Hop', 'Jazz', 'Classical',
  'Electronic', 'Country', 'Folk', 'R&B', 'Metal',
] as const;

export const HOBBY_OPTIONS = [
  'Gaming', 'Reading', 'Hiking', 'Cooking', 'Art',
  'Music', 'Travel', 'Fitness', 'Films', 'Writing',
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];
export type Hobby = typeof HOBBY_OPTIONS[number];
