import { VideoFormat } from '../types';

export function detectVideoFormat(url: string, explicitFormat?: VideoFormat): VideoFormat {
  if (explicitFormat && explicitFormat !== 'auto') {
    return explicitFormat;
  }

  if (!url || typeof url !== 'string') return 'mp4';
  const cleanUrl = url.trim().toLowerCase();

  // Check for embeds (YouTube, Vimeo, Dailymotion, or explicit embed/iframe url)
  if (
    cleanUrl.includes('youtube.com/embed/') ||
    cleanUrl.includes('youtube.com/watch') ||
    cleanUrl.includes('youtu.be/') ||
    cleanUrl.includes('player.vimeo.com/') ||
    cleanUrl.includes('vimeo.com/') ||
    cleanUrl.includes('dailymotion.com/embed') ||
    cleanUrl.includes('/embed/') ||
    cleanUrl.includes('iframe')
  ) {
    return 'embed';
  }

  // Check HLS (.m3u8)
  if (cleanUrl.includes('.m3u8') || cleanUrl.includes('application/x-mpegurl') || cleanUrl.includes('hls')) {
    return 'hls';
  }

  // Check DASH (.mpd)
  if (cleanUrl.includes('.mpd') || cleanUrl.includes('dash')) {
    return 'dash';
  }

  // Check WebM
  if (cleanUrl.includes('.webm')) {
    return 'webm';
  }

  // Direct MP4 or default video
  if (cleanUrl.includes('.mp4') || cleanUrl.includes('.m4v')) {
    return 'mp4';
  }

  return 'auto';
}

export function formatEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // YouTube watch link to embed link
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // Vimeo link to player embed
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`;
  }

  return trimmed;
}

export function isHlsSupportedNatively(videoElement?: HTMLVideoElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const testEl = videoElement || document.createElement('video');
  return Boolean(
    testEl.canPlayType('application/vnd.apple.mpegurl') ||
    testEl.canPlayType('application/x-mpegURL')
  );
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function padEpisodeNumber(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}
