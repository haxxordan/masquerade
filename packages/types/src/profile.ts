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
  gender: Gender;
  lookingFor: LookingFor;
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
  gender: Gender;
  lookingFor: LookingFor;
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
  gender?: Gender;
  lookingFor?: LookingFor;
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

export const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Other'] as const;
export type Gender = typeof GENDER_OPTIONS[number];

export const LOOKING_FOR_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Other', 'Everyone'] as const;
export type LookingFor = typeof LOOKING_FOR_OPTIONS[number];