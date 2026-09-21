import { WatchHistoryItem, Episode, Series, Season, User } from '../types';

const WATCH_HISTORY_PREFIX = 'stream_user_watch_history_';
const GUEST_KEY = 'guest_anonymous';

function getStorageKey(userEmail?: string | null): string {
  if (userEmail && userEmail.trim()) {
    return `${WATCH_HISTORY_PREFIX}${userEmail.trim().toLowerCase()}`;
  }
  return `${WATCH_HISTORY_PREFIX}${GUEST_KEY}`;
}

/**
 * Retrieves watch history for a given user email (or guest).
 */
export function getWatchHistory(userEmail?: string | null): WatchHistoryItem[] {
  try {
    const key = getStorageKey(userEmail);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const items: WatchHistoryItem[] = JSON.parse(raw);
    return Array.isArray(items)
      ? items.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))
      : [];
  } catch (err) {
    console.error('Failed to get watch history:', err);
    return [];
  }
}

/**
 * Records or updates watch progress for an episode.
 */
export function recordWatchProgress(
  episode: Episode,
  series?: Series | null,
  season?: Season | null,
  currentTimeSeconds: number = 0,
  durationSeconds: number = 0,
  userEmail?: string | null
): void {
  if (!episode || !episode.id) return;

  try {
    const key = getStorageKey(userEmail);
    const currentList = getWatchHistory(userEmail);

    const id = `${series?.id || 'default'}_${episode.id}`;
    const completed = durationSeconds > 0 && currentTimeSeconds / durationSeconds >= 0.9;

    const existingIndex = currentList.findIndex((item) => item.id === id || item.episodeId === episode.id);

    const updatedItem: WatchHistoryItem = {
      id,
      episodeId: episode.id,
      seriesId: series?.id || 'default',
      seasonId: season?.id || 'season-1',
      seriesTitle: series?.title || 'Video Stream',
      seasonNumber: season?.seasonNumber || 1,
      episodeNumber: episode.episodeNumber || 1,
      title: episode.title,
      thumbnailUrl: episode.thumbnailUrl || series?.posterUrl,
      videoUrl: episode.videoUrl,
      lastWatchedAt: Date.now(),
      currentTimeSeconds: Math.round(currentTimeSeconds),
      durationSeconds: Math.round(durationSeconds),
      completed,
    };

    let newList: WatchHistoryItem[];
    if (existingIndex >= 0) {
      newList = [...currentList];
      newList[existingIndex] = updatedItem;
    } else {
      newList = [updatedItem, ...currentList];
    }

    // Keep up to 100 recent items
    newList = newList.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(newList));

    // If guest, keep it; if user is logged in, also update user's master list
  } catch (err) {
    console.error('Failed to record watch progress:', err);
  }
}

/**
 * When a user logs in / registers, merge any recent guest watch history into their persistent user account!
 */
export function syncWatchHistoryOnLogin(userEmail: string): WatchHistoryItem[] {
  if (!userEmail) return [];
  try {
    const userKey = getStorageKey(userEmail);
    const guestKey = getStorageKey(null);

    const userHistory = getWatchHistory(userEmail);
    const guestHistory = getWatchHistory(null);

    if (guestHistory.length === 0) {
      return userHistory;
    }

    // Merge without duplicates (favoring most recent timestamp)
    const map = new Map<string, WatchHistoryItem>();
    userHistory.forEach((item) => map.set(item.episodeId, item));

    guestHistory.forEach((guestItem) => {
      const existing = map.get(guestItem.episodeId);
      if (!existing || (guestItem.lastWatchedAt || 0) > (existing.lastWatchedAt || 0)) {
        map.set(guestItem.episodeId, guestItem);
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0)
    );

    localStorage.setItem(userKey, JSON.stringify(merged));
    // Clear guest history now that it is safely imported into account
    localStorage.removeItem(guestKey);

    return merged;
  } catch (err) {
    console.error('Failed to sync history on login:', err);
    return getWatchHistory(userEmail);
  }
}

/**
 * Clears watch history for a specific user.
 */
export function clearWatchHistory(userEmail?: string | null): void {
  try {
    const key = getStorageKey(userEmail);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear watch history:', err);
  }
}

/**
 * Removes a single episode from watch history.
 */
export function removeWatchHistoryItem(episodeId: string, userEmail?: string | null): WatchHistoryItem[] {
  try {
    const key = getStorageKey(userEmail);
    const list = getWatchHistory(userEmail).filter((item) => item.episodeId !== episodeId);
    localStorage.setItem(key, JSON.stringify(list));
    return list;
  } catch (err) {
    console.error('Failed to remove history item:', err);
    return getWatchHistory(userEmail);
  }
}
