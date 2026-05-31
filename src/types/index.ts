export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  likedSongs?: Record<string, boolean>;
  playlists?: Record<string, boolean>;
  history?: Record<string, { songId: string; playedAt: number }>;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  songUrl: string;
  duration: number;
  createdAt: number;
  uploadedBy: string;
  uploaderName?: string;
  playCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  iconUrl?: string;
  songs?: Record<string, boolean>; // Map of song IDs
  createdAt: number;
  isPublic: boolean;
}
