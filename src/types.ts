export type VideoFormat = 'auto' | 'mp4' | 'webm' | 'hls' | 'dash' | 'embed';

export interface Episode {
  id: string;
  episodeNumber: number; // e.g. 1, 2, 3
  title: string;
  videoUrl: string;
  videoFormat: VideoFormat; // 'auto' or explicit
  duration?: string;
  quality?: string; // e.g. '1080p Full HD', '720p HD', '4K UHD', '480p SD'
  resolution?: { width: number; height: number };
  description?: string;
  thumbnailUrl?: string;
  status?: 'published' | 'draft';
  isPublished?: boolean;
  language?: string;
}

export interface Season {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string;
  logoUrl?: string;
  seasons: Season[];
}

export interface AppConfig {
  logoUrl: string;
  logoText: string;
  activeSeriesId: string;
  series: Series[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: number;
}

export interface WatchHistoryItem {
  id: string; // `${seriesId}_${episodeId}`
  episodeId: string;
  seriesId: string;
  seasonId: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  thumbnailUrl?: string;
  videoUrl: string;
  lastWatchedAt: number;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
}

export interface OfflineVideo {
  id: string; // unique offline storage ID
  episodeId: string;
  seriesId: string;
  seasonId: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  thumbnailUrl?: string;
  videoBlob?: Blob;
  blobUrl?: string;
  originalUrl?: string;
  mimeType: string;
  sizeBytes: number;
  duration?: string;
  quality?: string;
  downloadedAt: number;
  userEmail?: string;
}

export interface VideoValidationResult {
  valid: boolean;
  detectedFormat: VideoFormat;
  contentType?: string;
  statusCode?: number;
  error?: string;
}

export interface ContentRequest {
  id: string;
  title: string;
  contentType: 'movie' | 'drama' | 'anime' | 'series';
  language: string;
  description?: string;
  requesterName?: string;
  userEmail?: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'completed';
  votes: number;
}

