import React, { useState, useRef } from 'react';
import { Play, CheckCircle2, Edit2, Clock, Plus, FolderPlus, Trash2, Download, Copy, Check, Layers } from 'lucide-react';
import { Season, Episode } from '../types';
import { padEpisodeNumber } from '../utils/videoDetector';
import { copyToClipboard } from '../utils/clipboard';

interface EpisodeListProps {
  seriesId?: string;
  seasons: Season[];
  selectedSeasonId: string;
  selectedEpisodeId: string;
  isAdmin?: boolean;
  onSelectSeason: (seasonId: string) => void;
  onSelectEpisode: (episode: Episode) => void;
  onEditEpisodeLink?: (episode: Episode) => void;
  onDeleteEpisode?: (episodeId: string) => void;
  onDownloadEpisode?: (episode: Episode) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  seriesId,
  seasons,
  selectedSeasonId,
  selectedEpisodeId,
  isAdmin = false,
  onSelectSeason,
  onSelectEpisode,
  onEditEpisodeLink,
  onDeleteEpisode,
  onDownloadEpisode,
}) => {
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [copiedEpisodeId, setCopiedEpisodeId] = useState<string | null>(null);
  const [copiedSeason, setCopiedSeason] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const seasonTimeoutRef = useRef<number | null>(null);
  const currentSeason = seasons.find((s) => s.id === selectedSeasonId) || seasons[0];

  const handleCopyEpisodeUrl = async (e: React.MouseEvent, ep: Episode) => {
    e.stopPropagation();
    if (!ep.videoUrl) return;
    const success = await copyToClipboard(ep.videoUrl);
    if (success) {
      setCopiedEpisodeId(ep.id);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopiedEpisodeId(null), 2000);
    }
  };

  const handleCopyCurrentSeason = async () => {
    if (!currentSeason) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const url = seriesId
      ? `${baseUrl}?series=${encodeURIComponent(seriesId)}&season=${encodeURIComponent(currentSeason.id)}`
      : `${baseUrl}?season=${encodeURIComponent(currentSeason.id)}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedSeason(true);
      if (seasonTimeoutRef.current) window.clearTimeout(seasonTimeoutRef.current);
      seasonTimeoutRef.current = window.setTimeout(() => setCopiedSeason(false), 2000);
    }
  };

  if (!seasons || seasons.length === 0) {
    return (
      <div className="py-10 px-4 text-center rounded-2xl bg-[#111420] border border-[#20273a] my-6 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400 flex items-center justify-center">
          <FolderPlus className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white">No Seasons or Episodes Available</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Content will appear here once added in Admin Setup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-6">
      {/* 1. Season Selector (shown if 1 or more seasons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#202538] pb-3 mb-5 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 flex-1">
          {seasons.map((season) => {
            const isSeasonActive = season.id === (currentSeason?.id || selectedSeasonId);
            return (
              <button
                key={season.id}
                type="button"
                onClick={() => onSelectSeason(season.id)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSeasonActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'bg-[#151824] hover:bg-[#1f2436] text-gray-300 border border-[#252b40]'
                }`}
              >
                <span>{season.title || `Season ${season.seasonNumber}`}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSeasonActive ? 'bg-red-800 text-white' : 'bg-[#212638] text-gray-400'
                  }`}
                >
                  {season.episodes.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Copy Current Season URL Button */}
        {currentSeason && (
          <button
            type="button"
            onClick={handleCopyCurrentSeason}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
              copiedSeason
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-[#151928] hover:bg-[#1e243a] text-gray-300 hover:text-white border-[#273048]'
            }`}
            title={`Copy direct link for ${currentSeason.title || 'this season'}`}
          >
            {copiedSeason ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Season URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Copy {currentSeason.title || 'Season'} URL</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 2. Episode List */}
      <div className="space-y-2.5">
        {currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
          currentSeason.episodes.map((ep) => {
          const isSelected = ep.id === selectedEpisodeId;
          const formattedEpNum = `Episode ${padEpisodeNumber(ep.episodeNumber)}`;

          return (
            <div
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              id={`episode-row-${ep.id}`}
              className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                isSelected
                  ? 'bg-[#1a1420] border-red-500/80 shadow-lg shadow-red-950/20 ring-1 ring-red-500/50'
                  : 'bg-[#121520] hover:bg-[#181d2c] border-[#22273a] hover:border-[#323955]'
              }`}
            >
              {/* Left Side: Thumbnail or Play indicator, Episode Number, Title */}
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Episode Thumbnail or Play Button */}
                {ep.thumbnailUrl ? (
                  <div className="relative w-16 h-10 sm:w-24 sm:h-14 rounded-lg overflow-hidden shrink-0 border border-[#242b40] bg-[#0c0e17] group-hover:border-[#384364] transition-all">
                    <img
                      src={ep.thumbnailUrl}
                      alt={ep.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {isSelected ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-1 bg-red-500 h-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                          <span className="w-1 bg-red-500 h-2/3 animate-[pulse_0.6s_ease-in-out_infinite_0.2s]" />
                          <span className="w-1 bg-red-500 h-4/5 animate-[pulse_0.7s_ease-in-out_infinite_0.4s]" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                        : 'bg-[#1b2030] text-gray-400 group-hover:text-white group-hover:bg-red-600/90'
                    }`}
                  >
                    {isSelected ? (
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-1 bg-white h-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                        <span className="w-1 bg-white h-2/3 animate-[pulse_0.6s_ease-in-out_infinite_0.2s]" />
                        <span className="w-1 bg-white h-4/5 animate-[pulse_0.7s_ease-in-out_infinite_0.4s]" />
                      </div>
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold tracking-wide ${
                        isSelected ? 'text-red-400' : 'text-gray-100 group-hover:text-white'
                      }`}
                    >
                      {formattedEpNum}
                    </span>

                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                        Now Playing
                      </span>
                    )}
                  </div>

                  {ep.title && (
                    <p className="text-xs text-gray-400 truncate mt-0.5 max-w-md sm:max-w-xl">
                      {ep.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: Quality Badge, Duration, Format Badge, Download & Quick Edit */}
              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                {ep.quality && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    {ep.quality}
                  </span>
                )}

                {ep.duration && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 font-mono">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {ep.duration}
                  </span>
                )}

                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#1c2233] text-gray-400 border border-[#2b334d]">
                  {ep.videoFormat || 'auto'}
                </span>

                {/* Copy Video URL Button */}
                {ep.videoUrl && (
                  <button
                    type="button"
                    onClick={(e) => handleCopyEpisodeUrl(e, ep)}
                    className={`p-1.5 rounded-md transition-colors ${
                      copiedEpisodeId === ep.id
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={copiedEpisodeId === ep.id ? 'Copied URL!' : `Copy URL for ${formattedEpNum}`}
                  >
                    {copiedEpisodeId === ep.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDownloadEpisode) {
                      onDownloadEpisode(ep);
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-md transition-colors"
                  title={`Download ${formattedEpNum} (Mobile, Laptop, Website)`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })
        ) : (
          <div className="py-8 px-4 text-center rounded-xl bg-[#121520] border border-[#202538] flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold text-gray-300">
              No episodes in &quot;{currentSeason?.title || 'this season'}&quot; yet.
            </p>
            <p className="text-xs text-gray-500 max-w-sm">
              Click &quot;+ Upload Episode&quot; above to add your first video to this season.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Removing Episode */}
      {episodeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#141826] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Remove Episode?</h4>
                <p className="text-xs text-gray-400">
                  This episode will be deleted from &quot;{currentSeason?.title || 'this playlist'}&quot;.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0e111a] border border-[#232a40] text-xs">
              <p className="font-bold text-white">
                Episode {episodeToDelete.episodeNumber}: {episodeToDelete.title}
              </p>
              {episodeToDelete.duration && (
                <p className="text-gray-400 text-[11px] mt-0.5 font-mono">
                  Duration: {episodeToDelete.duration}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setEpisodeToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteEpisode && episodeToDelete) {
                    onDeleteEpisode(episodeToDelete.id);
                  }
                  setEpisodeToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
