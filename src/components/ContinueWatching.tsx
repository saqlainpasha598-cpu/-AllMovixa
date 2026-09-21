import React, { useEffect, useState, useCallback } from 'react';
import {
  Play,
  Clock,
  X,
  Tv,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { WatchHistoryItem, User } from '../types';
import { getWatchHistory, removeWatchHistoryItem } from '../utils/userHistory';
import { formatTime } from '../utils/videoDetector';

interface ContinueWatchingProps {
  currentUser?: User | null;
  currentEpisodeId?: string;
  onSelectEpisode: (
    seriesId: string,
    seasonId: string,
    episodeId: string,
    resumeTime?: number
  ) => void;
  onViewAllHistory?: () => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  currentUser,
  currentEpisodeId,
  onSelectEpisode,
  onViewAllHistory,
}) => {
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Load last 5 watched episodes
  const loadHistory = useCallback(() => {
    const all = getWatchHistory(currentUser?.email);
    // Take the top 5 most recently started episodes
    const top5 = all.slice(0, 5);
    setHistoryItems(top5);
  }, [currentUser?.email]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Listen to live watch progress updates
  useEffect(() => {
    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener('watchHistoryUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('watchHistoryUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadHistory]);

  const handleRemove = (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    setRemovedIds((prev) => new Set(prev).add(episodeId));
    removeWatchHistoryItem(episodeId, currentUser?.email);
    setTimeout(() => {
      loadHistory();
    }, 200);
  };

  const visibleItems = historyItems.filter((item) => !removedIds.has(item.episodeId));

  // If no items started yet, don't render section
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      id="continue-watching-section"
      className="w-full my-6 bg-[#0e121e] border border-[#20283e] rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                Continue Watching
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                {visibleItems.length} {visibleItems.length === 1 ? 'Episode' : 'Episodes'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Pick up right where you left off
            </p>
          </div>
        </div>

        {onViewAllHistory && (
          <button
            type="button"
            onClick={onViewAllHistory}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards Grid: 1 to 5 items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {visibleItems.map((item) => {
          const currentTime = item.currentTimeSeconds || 0;
          const duration = item.durationSeconds || 0;
          const hasDuration = duration > 0;
          
          const progressPct = hasDuration
            ? Math.min(100, Math.max(1, Math.round((currentTime / duration) * 100)))
            : currentTime > 0
            ? 35
            : 0;

          const isCurrentlyPlaying = currentEpisodeId === item.episodeId;
          const isFinished = item.completed || progressPct >= 95;

          return (
            <div
              key={item.id || item.episodeId}
              id={`continue-card-${item.episodeId}`}
              onClick={() =>
                onSelectEpisode(
                  item.seriesId,
                  item.seasonId,
                  item.episodeId,
                  currentTime
                )
              }
              className={`group relative bg-[#141826] hover:bg-[#191f32] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between hover:shadow-lg hover:shadow-red-950/20 hover:-translate-y-0.5 ${
                isCurrentlyPlaying
                  ? 'border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500/50'
                  : 'border-[#242c44] hover:border-red-500/50'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full bg-[#0a0d14] overflow-hidden">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gradient-to-br from-[#121624] to-[#0c0e18]">
                    <Tv className="w-8 h-8 opacity-60 text-gray-500 mb-1" />
                    <span className="text-[10px] text-gray-500 font-mono">
                      EP {item.episodeNumber < 10 ? '0' : ''}
                      {item.episodeNumber}
                    </span>
                  </div>
                )}

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                {/* Dismiss / Remove Button */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item.episodeId)}
                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                  title="Remove from Continue Watching"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Percentage Badge */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md flex items-center gap-1 ${
                      isFinished
                        ? 'bg-emerald-600 text-white'
                        : isCurrentlyPlaying
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-black/75 backdrop-blur-xs text-red-400 border border-red-500/30'
                    }`}
                  >
                    {isFinished ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <span>{progressPct}%</span>
                    )}
                  </span>
                </div>

                {/* Hover Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFinished
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-red-600 to-rose-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Card Metadata */}
              <div className="p-2.5 flex flex-col justify-between flex-1">
                <div>
                  {/* Series Title */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] font-semibold text-gray-400 truncate block">
                      {item.seriesTitle || 'Video Series'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                      S{item.seasonNumber || 1}:E{item.episodeNumber || 1}
                    </span>
                  </div>

                  {/* Episode Title */}
                  <h4
                    className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 leading-snug"
                    title={item.title}
                  >
                    {item.title || `Episode ${item.episodeNumber}`}
                  </h4>
                </div>

                {/* Remaining / Watched Time */}
                <div className="mt-2 pt-1.5 border-t border-[#1e2538] flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-mono">
                    {hasDuration
                      ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                      : currentTime > 0
                      ? `${formatTime(currentTime)} watched`
                      : 'Started'}
                  </span>

                  {hasDuration && !isFinished && (
                    <span className="text-gray-500">
                      {formatTime(Math.max(0, duration - currentTime))} left
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
