import { OfflineVideo } from '../types';

const DB_NAME = 'stream_offline_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'episodeId' });
        store.createIndex('seriesId', 'seriesId', { unique: false });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open offline database'));
    };
  });
}

/**
 * Downloads a video from URL with progress reporting and saves it directly into IndexedDB.
 */
export async function downloadAndSaveOfflineVideo(
  videoMetadata: {
    episodeId: string;
    seriesId: string;
    seasonId: string;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    thumbnailUrl?: string;
    duration?: string;
    quality?: string;
    videoUrl: string;
    userEmail?: string;
  },
  onProgress?: (progress: { percent: number; loadedBytes: number; totalBytes: number; speedBps: number }) => void
): Promise<OfflineVideo> {
  const startTime = Date.now();
  let lastLoaded = 0;
  let lastTime = startTime;
  let speedBps = 0;

  // Use fetch with ReadableStream for progress tracking
  const response = await fetch(videoMetadata.videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video stream (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  const mimeType = response.headers.get('content-type') || 'video/mp4';

  let blob: Blob;

  if (response.body && totalBytes > 0) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        receivedBytes += value.length;

        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.5) {
          speedBps = (receivedBytes - lastLoaded) / timeDiff;
          lastLoaded = receivedBytes;
          lastTime = now;
        }

        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress?.({
          percent,
          loadedBytes: receivedBytes,
          totalBytes,
          speedBps,
        });
      }
    }

    blob = new Blob(chunks, { type: mimeType });
  } else {
    // Fallback if ReadableStream is not available
    blob = await response.blob();
    onProgress?.({
      percent: 100,
      loadedBytes: blob.size,
      totalBytes: blob.size,
      speedBps: 0,
    });
  }

  const offlineItem: OfflineVideo = {
    id: `offline-${videoMetadata.episodeId}`,
    episodeId: videoMetadata.episodeId,
    seriesId: videoMetadata.seriesId,
    seasonId: videoMetadata.seasonId,
    seriesTitle: videoMetadata.seriesTitle,
    seasonNumber: videoMetadata.seasonNumber,
    episodeNumber: videoMetadata.episodeNumber,
    title: videoMetadata.title,
    thumbnailUrl: videoMetadata.thumbnailUrl,
    videoBlob: blob,
    originalUrl: videoMetadata.videoUrl,
    mimeType: blob.type || 'video/mp4',
    sizeBytes: blob.size,
    duration: videoMetadata.duration,
    quality: videoMetadata.quality || 'HD',
    downloadedAt: Date.now(),
    userEmail: videoMetadata.userEmail,
  };

  await saveOfflineVideoRecord(offlineItem);
  return offlineItem;
}

/**
 * Saves an OfflineVideo object into IndexedDB
 */
export async function saveOfflineVideoRecord(item: OfflineVideo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save offline video'));
  });
}

/**
 * Retrieves all offline saved videos from IndexedDB with generated object URLs
 */
export async function getAllOfflineVideos(userEmail?: string | null): Promise<OfflineVideo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let items: OfflineVideo[] = request.result || [];
      
      // If userEmail is provided, we can either filter or prioritize this user's videos
      if (userEmail && userEmail.trim()) {
        const normalized = userEmail.trim().toLowerCase();
        items = items.filter((item) => !item.userEmail || item.userEmail.toLowerCase() === normalized);
      }

      // Attach transient blob URLs for instant playback
      const withBlobUrls = items.map((item) => {
        if (item.videoBlob && !item.blobUrl) {
          try {
            item.blobUrl = URL.createObjectURL(item.videoBlob);
          } catch (e) {
            console.error('Failed to create object URL for offline video:', e);
          }
        }
        return item;
      });
      // Sort by newest downloaded first
      withBlobUrls.sort((a, b) => b.downloadedAt - a.downloadedAt);
      resolve(withBlobUrls);
    };

    request.onerror = () => reject(request.error || new Error('Failed to load offline videos'));
  });
}

/**
 * Check if a specific episode is already saved offline
 */
export async function getOfflineVideo(episodeId: string): Promise<OfflineVideo | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(episodeId);

      request.onsuccess = () => {
        const item: OfflineVideo | undefined = request.result;
        if (item && item.videoBlob) {
          item.blobUrl = URL.createObjectURL(item.videoBlob);
          resolve(item);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a video from IndexedDB offline storage
 */
export async function deleteOfflineVideo(episodeId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(episodeId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to delete offline video'));
  });
}

/**
 * Clears all offline saved videos
 */
export async function clearAllOfflineVideos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear offline videos'));
  });
}

/**
 * Helper to get total offline storage used
 */
export async function getOfflineStorageStats(): Promise<{
  totalCount: number;
  totalSizeBytes: number;
  formattedSize: string;
  storageQuotaBytes?: number;
}> {
  try {
    const list = await getAllOfflineVideos();
    const totalCount = list.length;
    const totalSizeBytes = list.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);

    let quotaBytes: number | undefined;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
    }

    return {
      totalCount,
      totalSizeBytes,
      formattedSize: formatBytes(totalSizeBytes),
      storageQuotaBytes: quotaBytes,
    };
  } catch {
    return {
      totalCount: 0,
      totalSizeBytes: 0,
      formattedSize: '0 B',
    };
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
