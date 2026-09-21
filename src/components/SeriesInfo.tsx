import React, { useState } from 'react';
import { Layers, Film, Share2, Heart } from 'lucide-react';
import { Series, Season, Episode } from '../types';

interface SeriesInfoProps {
  series: Series;
  currentSeason: Season | null;
  currentEpisode: Episode | null;
  isAdmin?: boolean;
  onOpenShareModal?: () => void;
}

export const SeriesInfo: React.FC<SeriesInfoProps> = ({
  series,
  currentSeason,
  currentEpisode,
  isAdmin,
  onOpenShareModal,
}) => {
  const totalSeasons = series.seasons.length;
  const totalEpisodes = series.seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0
  );

  const [likesCount, setLikesCount] = useState<number>(() => {
    if (!currentEpisode) return 42;
    try {
      const saved = localStorage.getItem(`stream_likes_${currentEpisode.id}`);
      return saved ? parseInt(saved, 10) : 42;
    } catch (e) {
      return 42;
    }
  });

  const [isLiked, setIsLiked] = useState<boolean>(() => {
    if (!currentEpisode) return false;
    try {
      return localStorage.getItem(`stream_liked_${currentEpisode.id}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleLikeClick = () => {
    if (!currentEpisode) return;
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(newLiked);
    setLikesCount(newCount);
    try {
      localStorage.setItem(`stream_liked_${currentEpisode.id}`, newLiked ? 'true' : 'false');
      localStorage.setItem(`stream_likes_${currentEpisode.id}`, newCount.toString());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full pb-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {series.title}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
              Active Playlist
            </span>
          </div>
          {series.description && (
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-3xl line-clamp-2">
              {series.description}
            </p>
          )}
        </div>

        {/* Series Action Badges: Like, Share, Seasons, Episodes */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-medium flex-wrap">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
              isLiked
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                : 'bg-[#191d2c] hover:bg-[#232a3f] text-gray-300 hover:text-white border-[#272e45]'
            }`}
            title="Like this episode"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
            <span>{likesCount} Likes</span>
          </button>

          {/* Full Share / Copy Dialog Trigger */}
          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1d2338] hover:bg-[#283250] border border-[#303e63] text-gray-200 hover:text-white transition-colors"
              title="Open full Copy & Share dialog"
            >
              <Share2 className="w-3.5 h-3.5 text-red-400" />
              <span>Share</span>
            </button>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#191d2c] border border-[#272e45] text-gray-300">
            <Layers className="w-3.5 h-3.5 text-red-500" />
            <span>{totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#191d2c] border border-[#272e45] text-gray-300">
            <Film className="w-3.5 h-3.5 text-red-500" />
            <span>{totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}</span>
          </span>
        </div>
      </div>

      {/* Current playing episode headline if available */}
      {currentEpisode && currentSeason && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-400 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-200">
              Season {currentSeason.seasonNumber}: {currentSeason.title}
            </span>
            <span>•</span>
            <span className="text-red-400 font-semibold">
              Episode {currentEpisode.episodeNumber}: {currentEpisode.title}
            </span>
          </div>
          {currentEpisode.duration && (
            <span className="font-mono text-[11px] bg-[#141824] px-2 py-0.5 rounded border border-[#232a3f]">
              {currentEpisode.duration}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
