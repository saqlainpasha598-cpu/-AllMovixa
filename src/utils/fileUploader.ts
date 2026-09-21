import { VideoFormat } from '../types';

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  format?: VideoFormat;
  error?: string;
}

/**
 * Uploads a video file to /api/upload/video with progress tracking
 */
export function uploadVideoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('video', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve({
            success: true,
            url: data.url,
            filename: data.filename,
            size: data.size,
            format: data.format,
          });
        } else {
          resolve({
            success: false,
            error: data.error || `Upload failed with status ${xhr.status}`,
          });
        }
      } catch (err: any) {
        resolve({
          success: false,
          error: 'Failed to parse upload server response.',
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Network error occurred during video upload.',
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        error: 'Upload was cancelled.',
      });
    });

    xhr.open('POST', '/api/upload/video');
    xhr.send(formData);
  });
}

/**
 * Uploads a thumbnail or image file to /api/upload/thumbnail
 */
export function uploadThumbnailFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('thumbnail', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve({
            success: true,
            url: data.url,
            filename: data.filename,
            size: data.size,
          });
        } else {
          resolve({
            success: false,
            error: data.error || `Upload failed with status ${xhr.status}`,
          });
        }
      } catch (err: any) {
        resolve({
          success: false,
          error: 'Failed to parse thumbnail response.',
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Network error occurred during thumbnail upload.',
      });
    });

    xhr.open('POST', '/api/upload/thumbnail');
    xhr.send(formData);
  });
}

/**
 * Deletes an uploaded file (video or thumbnail) from the server
 */
export async function deleteUploadedFile(url: string): Promise<boolean> {
  if (!url || !url.startsWith('/uploads/')) {
    return true; // Not a local server file
  }

  try {
    const res = await fetch('/api/upload/file', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (err) {
    console.warn('Failed to delete uploaded file from server:', err);
  }
  return false;
}

/**
 * Format bytes to readable string (e.g. 24.5 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Video metadata extraction result
 */
export interface VideoMetadata {
  duration: string;
  width: number;
  height: number;
  qualityLabel: string; // '4K UHD', '1080p Full HD', '720p HD', '480p SD', '360p SD'
  shortQuality: string; // '4K', '1080p', '720p', '480p', '360p'
}

/**
 * Calculates human-readable quality from video height and width
 */
export function getQualityLabelFromResolution(width: number, height: number): { qualityLabel: string; shortQuality: string } {
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);

  if (minDim >= 2160 || maxDim >= 3840) {
    return { qualityLabel: '4K UHD (2160p)', shortQuality: '4K' };
  } else if (minDim >= 1440 || maxDim >= 2560) {
    return { qualityLabel: '2K QHD (1440p)', shortQuality: '1440p' };
  } else if (minDim >= 1000 || maxDim >= 1900) {
    return { qualityLabel: '1080p Full HD', shortQuality: '1080p' };
  } else if (minDim >= 700 || maxDim >= 1200) {
    return { qualityLabel: '720p HD', shortQuality: '720p' };
  } else if (minDim >= 460 || maxDim >= 800) {
    return { qualityLabel: '480p SD', shortQuality: '480p' };
  } else if (minDim >= 340) {
    return { qualityLabel: '360p SD', shortQuality: '360p' };
  } else if (minDim > 0) {
    return { qualityLabel: `${minDim}p`, shortQuality: `${minDim}p` };
  }
  return { qualityLabel: 'HD', shortQuality: 'HD' };
}

/**
 * Extracts complete metadata (duration, width, height, quality) from a local video file
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        tempVideo.remove();
      };

      tempVideo.onloadedmetadata = () => {
        const sec = Math.floor(tempVideo.duration);
        const width = tempVideo.videoWidth || 0;
        const height = tempVideo.videoHeight || 0;

        let durationStr = '';
        if (!isNaN(sec) && sec > 0) {
          const hours = Math.floor(sec / 3600);
          const minutes = Math.floor((sec % 3600) / 60);
          const seconds = sec % 60;
          if (hours > 0) {
            durationStr = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
          } else {
            durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
          }
        }

        const { qualityLabel, shortQuality } = getQualityLabelFromResolution(width, height);
        cleanup();

        resolve({
          duration: durationStr,
          width,
          height,
          qualityLabel,
          shortQuality,
        });
      };

      tempVideo.onerror = () => {
        cleanup();
        resolve(null);
      };

      // 6 second timeout
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 6000);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Extracts duration in MM:SS or HH:MM:SS from a local video file
 */
export function extractVideoDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
    extractVideoMetadata(file).then((meta) => {
      resolve(meta ? meta.duration : '');
    });
  });
}
