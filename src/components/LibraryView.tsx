import React, { useState, useMemo } from 'react';
import {
  Film,
  Play,
  Layers,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  Folder,
  Trash2,
  Edit3,
  Tv,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  AlertTriangle,
  X,
  Download,
  Shield,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import { AppConfig, Series, Episode } from '../types';

interface LibraryViewProps {
  config: AppConfig;
  isAdmin?: boolean;
  onRequireAdminUnlock?: () => void;
  onSelectEpisodeToPlay: (seriesId: string, seasonId: string, episodeId: string) => void;
  onEditEpisode: (seriesId: string, seasonId: string, episode: Episode) => void;
  onDeleteEpisode: (seriesId: string, seasonId: string, episodeId: string) => void;
  onDeleteSeries: (seriesId: string) => void;
  onDownloadEpisode?: (series: Series, seasonId: string, episode: Episode) => void;
  onOpenAddEpisode: () => void;
  onOpenCreatePlaylist: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  config,
  isAdmin = false,
  onRequireAdminUnlock,
  onSelectEpisodeToPlay,
  onEditEpisode,
  onDeleteEpisode,
  onDeleteSeries,
  onDownloadEpisode,
  onOpenAddEpisode,
  onOpenCreatePlaylist,
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [selectedQualityFilter, setSelectedQualityFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'all_videos' | 'by_playlist'>('all_videos');
  const [pendingDelete, setPendingDelete] = useState<{
    seriesId: string;
    seasonId: string;
    episode: Episode;
  } | null>(null);
  const [pendingDeleteSeries, setPendingDeleteSeries] = useState<Series | null>(null);

  // Flatten all episodes with their series and season metadata
  const allVideos = useMemo(() => {
    const list: Array<{
      episode: Episode;
      series: Series;
      seasonId: string;
      seasonName: string;
      seasonNumber: number;
      isUploaded: boolean;
    }> = [];

    config.series.forEach((series) => {
      series.seasons.forEach((season) => {
        season.episodes.forEach((episode) => {
          const isUploaded =
            episode.videoUrl.startsWith('/uploads/') ||
            episode.videoUrl.includes('/uploads/videos/');
          list.push({
            episode,
            series,
            seasonId: season.id,
            seasonName: season.title || `Season ${season.seasonNumber}`,
            seasonNumber: season.seasonNumber,
            isUploaded,
          });
        });
      });
    });

    return list;
  }, [config]);

  // Unique qualities detected in the library
  const availableQualities = useMemo(() => {
    const set = new Set<string>();
    allVideos.forEach((v) => {
      if (v.episode.quality) {
        set.add(v.episode.quality);
      }
    });
    return Array.from(set);
  }, [allVideos]);

  // Filtered video list
  const filteredVideos = useMemo(() => {
    return allVideos.filter((item) => {
      // Filter by Series
      if (selectedSeriesFilter !== 'all' && item.series.id !== selectedSeriesFilter) {
        return false;
      }

      // Filter by Quality
      if (selectedQualityFilter !== 'all') {
        if (!item.episode.quality || !item.episode.quality.includes(selectedQualityFilter)) {
          return false;
        }
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.episode.title.toLowerCase().includes(q);
        const matchesDesc = (item.episode.description || '').toLowerCase().includes(q);
        const matchesSeries = item.series.title.toLowerCase().includes(q);
        const matchesSeason = item.seasonName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSeries && !matchesSeason) {
          return false;
        }
      }

      return true;
    });
  }, [allVideos, selectedSeriesFilter, selectedQualityFilter, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-[#111522] via-[#14192b] to-[#121624] border border-[#20273d] rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase tracking-wider">
                <Film className="w-4 h-4" />
                <span>Media Library & Uploads</span>
              </div>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> Admin Mode Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Lock className="w-3 h-3" /> Viewer Mode (Watch & Download)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Uploaded Videos & Playlists
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Admin Mode: Upload new videos, create playlists, edit video links, and delete content permanently.'
                : 'Viewer Mode: Stream any video directly or download to your PC, Mobile, and Website offline storage.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={onOpenAddEpisode}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/40"
                >
                  <span>+ Upload Video</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCreatePlaylist}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-[#1a2033] hover:bg-[#222b45] text-gray-200 hover:text-white rounded-xl text-xs font-semibold border border-[#2b3554] transition-all"
                >
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Playlist</span>
                </button>
              </>
            ) : (
              onRequireAdminUnlock && (
                <button
                  type="button"
                  onClick={onRequireAdminUnlock}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2138] hover:bg-[#232c4a] text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold border border-amber-500/30 transition-all shadow-md"
                  title="Enter Admin Password (1234) to unlock uploading and deleting"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unlock Admin Mode (Upload / Delete)</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Quick Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#1d2338]">
          <div className="bg-[#0b0e17]/60 rounded-xl p-3 border border-[#1b2236]">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Playlists</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{config.series.length}</div>
          </div>
          <div className="bg-[#0b0e17]/60 rounded-xl p-3 border border-[#1b2236]">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Videos</div>
            <div className="text-xl sm:text-2xl font-black text-red-400 mt-0.5">{allVideos.length}</div>
          </div>
          <div className="bg-[#0b0e17]/60 rounded-xl p-3 border border-[#1b2236]">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Uploaded to Server</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {allVideos.filter((v) => v.isUploaded).length}
            </div>
          </div>
          <div className="bg-[#0b0e17]/60 rounded-xl p-3 border border-[#1b2236]">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">HD / 1080p Videos</div>
            <div className="text-xl sm:text-2xl font-black text-blue-400 mt-0.5">
              {allVideos.filter((v) => v.episode.quality?.includes('HD') || v.episode.quality?.includes('1080p')).length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#111420] border border-[#1c2338] p-3 rounded-xl">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0b0e17] rounded-lg border border-[#191f33] self-start">
          <button
            type="button"
            onClick={() => setViewTab('all_videos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewTab === 'all_videos'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>All Videos ({allVideos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('by_playlist')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewTab === 'by_playlist'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>By Playlist ({config.series.length})</span>
          </button>
        </div>

        {/* Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, title, season..."
              className="w-full bg-[#171c2b] text-xs text-white placeholder-gray-500 pl-8 pr-3 py-2 rounded-lg border border-[#242c44] focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Series Filter */}
          <select
            value={selectedSeriesFilter}
            onChange={(e) => setSelectedSeriesFilter(e.target.value)}
            className="bg-[#171c2b] text-xs text-gray-300 border border-[#242c44] rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Playlists</option>
            {config.series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* Quality Filter */}
          {availableQualities.length > 0 && (
            <select
              value={selectedQualityFilter}
              onChange={(e) => setSelectedQualityFilter(e.target.value)}
              className="bg-[#171c2b] text-xs text-gray-300 border border-[#242c44] rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Qualities</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
              <option value="4K">4K UHD</option>
              <option value="480p">480p SD</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewTab === 'all_videos' ? (
        /* 1. All Videos Grid View */
        <div>
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map(({ episode, series, seasonId, seasonName, isUploaded }) => {
                const thumb = episode.thumbnailUrl || series.posterUrl;
                return (
                  <div
                    key={`${series.id}-${seasonId}-${episode.id}`}
                    className="bg-[#121624] hover:bg-[#151a2c] border border-[#212940] hover:border-red-500/50 rounded-xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                  >
                    {/* Thumbnail / Video Preview Area */}
                    <div
                      className="relative aspect-video w-full bg-[#0a0c14] cursor-pointer overflow-hidden"
                      onClick={() => onSelectEpisodeToPlay(series.id, seasonId, episode.id)}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={episode.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#121624] to-[#1c2236] text-gray-500">
                          <Film className="w-8 h-8 mb-1 opacity-50" />
                          <span className="text-[10px] uppercase font-mono">No Thumbnail</span>
                        </div>
                      )}

                      {/* Dark Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-950/60 transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Top Badges: Playlist Name & Quality */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-gray-200 border border-white/10 truncate max-w-[140px]">
                          {series.title}
                        </span>
                        {episode.quality && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-500/40">
                            {episode.quality}
                          </span>
                        )}
                      </div>

                      {/* Bottom Badges: Episode Number & Duration */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs pointer-events-none">
                        <span className="font-mono text-[11px] font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded">
                          EP {episode.episodeNumber}
                        </span>
                        {episode.duration && (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-300 bg-black/70 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {episode.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Information Area */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
                          <span className="text-gray-300 font-medium">{seasonName}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] text-gray-400 font-mono">
                            {episode.videoFormat || 'video'}
                          </span>
                          {isUploaded && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Uploaded
                            </span>
                          )}
                        </div>
                        <h3
                          onClick={() => onSelectEpisodeToPlay(series.id, seasonId, episode.id)}
                          className="text-sm font-bold text-white line-clamp-1 hover:text-red-400 cursor-pointer transition-colors"
                          title={episode.title}
                        >
                          {episode.title}
                        </h3>
                        {episode.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                            {episode.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons: Play, Replace Link, Delete */}
                      <div className="pt-2 border-t border-[#1d243a] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectEpisodeToPlay(series.id, seasonId, episode.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Watch Now</span>
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onDownloadEpisode) {
                                  onDownloadEpisode(series, seasonId, episode);
                                }
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                              title="Download (Mobile / Laptop / Website)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditEpisode(series.id, seasonId, episode)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Replace or Edit Video Link"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingDelete({
                                    seriesId: series.id,
                                    seasonId,
                                    episode,
                                  });
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                title="Delete Episode"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center bg-[#10131f] border border-[#1d2338] rounded-2xl p-6">
              <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No videos found</h3>
              <p className="text-xs text-gray-400 mb-4">
                {searchQuery
                  ? 'No videos match your search query. Try clearing the filter.'
                  : isAdmin
                  ? 'Aap ne abhi tak koi video upload nahi ki. "+ Upload Video" button par click kar ke video upload karein.'
                  : 'Videos will appear here once uploaded by the admin.'}
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={onOpenAddEpisode}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  + Upload Video Now
                </button>
              ) : (
                onRequireAdminUnlock && (
                  <button
                    type="button"
                    onClick={onRequireAdminUnlock}
                    className="px-4 py-2 bg-[#1a2138] hover:bg-[#232c4a] text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 mx-auto"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Admin to Upload Video</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. Grouped By Playlist View */
        <div className="space-y-6">
          {config.series.map((series) => {
            const seriesEpisodesCount = series.seasons.reduce(
              (acc, s) => acc + s.episodes.length,
              0
            );

            return (
              <div
                key={series.id}
                className="bg-[#101421] border border-[#1e253c] rounded-2xl p-5 shadow-lg space-y-4"
              >
                {/* Playlist Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2135]">
                  <div className="flex items-center gap-3">
                    {series.posterUrl ? (
                      <img
                        src={series.posterUrl}
                        alt={series.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 object-cover rounded-lg border border-[#2b3552] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-[#161c2e] rounded-lg border border-[#242d45] flex items-center justify-center text-gray-500 shrink-0">
                        <Tv className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-white">{series.title}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                          {seriesEpisodesCount} Videos
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {series.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (series.seasons[0]?.episodes[0]) {
                          onSelectEpisodeToPlay(
                            series.id,
                            series.seasons[0].id,
                            series.seasons[0].episodes[0].id
                          );
                        }
                      }}
                      disabled={seriesEpisodesCount === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      title="Play from beginning of this playlist"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play Playlist</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={onOpenAddEpisode}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1b2238] hover:bg-[#252f4c] text-gray-200 hover:text-white rounded-lg text-xs font-semibold border border-[#2b3656] transition-all"
                          title="Add or upload a new video to this playlist"
                        >
                          <Film className="w-3 h-3 text-red-400" />
                          <span>+ Add Video</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPendingDeleteSeries(series)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold border border-red-900/40 hover:border-red-700/60 transition-all"
                          title="Delete this entire playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Playlist</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Seasons and Episodes inside this Playlist */}
                <div className="space-y-4">
                  {series.seasons.map((season) => (
                    <div key={season.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
                        <span className="flex items-center gap-1.5 text-gray-300 font-bold">
                          <Layers className="w-3.5 h-3.5 text-red-500" />
                          {season.title || `Season ${season.seasonNumber}`} ({season.episodes.length} episodes)
                        </span>
                      </div>

                      {season.episodes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {season.episodes.map((ep) => (
                            <div
                              key={ep.id}
                              className="bg-[#151929] hover:bg-[#1a2033] border border-[#232a42] hover:border-red-500/40 rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all group"
                            >
                              <div
                                className="cursor-pointer"
                                onClick={() => onSelectEpisodeToPlay(series.id, season.id, ep.id)}
                              >
                                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                  <span className="font-mono text-red-400 font-bold">
                                    EP {ep.episodeNumber}
                                  </span>
                                  {ep.quality && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                                      {ep.quality}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400 line-clamp-1 transition-colors">
                                  {ep.title}
                                </h4>
                                {ep.duration && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mt-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{ep.duration}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[#1f263c]">
                                <button
                                  type="button"
                                  onClick={() => onSelectEpisodeToPlay(series.id, season.id, ep.id)}
                                  className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                  <span>Play</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                                {isAdmin && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onEditEpisode(series.id, season.id, ep)}
                                      className="p-1 text-gray-400 hover:text-white"
                                      title="Edit Link"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPendingDelete({
                                          seriesId: series.id,
                                          seasonId: season.id,
                                          episode: ep,
                                        });
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-400"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#131724] rounded-xl text-center text-xs text-gray-500 border border-dashed border-[#20273c]">
                          Is season me abhi tak koi episode upload nahi hua.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141827] border border-[#26304d] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-500">
                <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Video / Episode</h3>
                  <p className="text-[11px] text-gray-400">Ye video playlist aur server storage se remove ho jayegi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f121e] border border-[#212840] space-y-1.5">
              <p className="text-xs font-bold text-white line-clamp-2">
                Episode {pendingDelete.episode.episodeNumber}: {pendingDelete.episode.title}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                {pendingDelete.episode.duration && (
                  <span>Duration: {pendingDelete.episode.duration}</span>
                )}
                <span className="uppercase text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/30">
                  {pendingDelete.episode.videoFormat}
                </span>
                {pendingDelete.episode.videoUrl.startsWith("/uploads/") && (
                  <span className="text-[10px] text-red-400 font-semibold">
                    (Uploaded Storage File)
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Kya aap waqai is video ko delete karna chahte hain? Agar ye PC se upload shuda video hai, toh iski file storage se bhi clean ho jayegi.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEpisode(
                    pendingDelete.seriesId,
                    pendingDelete.seasonId,
                    pendingDelete.episode.id
                  );
                  setPendingDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entire Playlist Confirmation Modal */}
      {pendingDeleteSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#131725] border border-red-900/40 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-500 font-bold text-sm sm:text-base">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <span>Delete Entire Playlist</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteSeries(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Playlist preview card */}
            <div className="p-3.5 rounded-xl bg-[#0f121e] border border-[#212840] flex items-center gap-3">
              {pendingDeleteSeries.posterUrl ? (
                <img
                  src={pendingDeleteSeries.posterUrl}
                  alt={pendingDeleteSeries.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-16 object-cover rounded-lg border border-[#29334f] shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-[#181f33] rounded-lg border border-[#242e47] flex items-center justify-center text-gray-500 shrink-0">
                  <Tv className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-extrabold text-white truncate">
                  {pendingDeleteSeries.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-1">
                  <span>{pendingDeleteSeries.seasons.length} Seasons</span>
                  <span>•</span>
                  <span>
                    {pendingDeleteSeries.seasons.reduce(
                      (acc, s) => acc + s.episodes.length,
                      0
                    )}{' '}
                    Videos
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#191520] p-3 rounded-xl border border-red-950/50">
              <span className="font-bold text-red-400">Khabardar:</span> Kya aap waqai is poori playlist &quot;{pendingDeleteSeries.title}&quot; ko delete karna chahte hain? Is playlist ke tamam seasons aur videos remove ho jayenge aur server se uploaded video files clean ho jayengi.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteSeries(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSeries(pendingDeleteSeries.id);
                  setPendingDeleteSeries(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Playlist</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
