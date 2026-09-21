import React, { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Trash2,
  HardDrive,
  Film,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Laptop,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  History,
  Clock,
  CheckCircle,
  LogIn,
  UserCheck,
  Copy,
  Check,
} from 'lucide-react';
import { OfflineVideo, User, WatchHistoryItem } from '../types';
import {
  getAllOfflineVideos,
  deleteOfflineVideo,
  clearAllOfflineVideos,
  getOfflineStorageStats,
  formatBytes,
} from '../utils/offlineStorage';
import {
  getWatchHistory,
  clearWatchHistory,
  removeWatchHistoryItem,
} from '../utils/userHistory';
import { copyToClipboard } from '../utils/clipboard';

interface DownloadsPageProps {
  currentUser: User | null;
  onRequireAuth: () => void;
  onPlayOfflineVideo: (video: OfflineVideo) => void;
  onPlayEpisodeOnline?: (seriesId: string, seasonId: string, episodeId: string) => void;
  onDownloadHistoryEpisode?: (item: WatchHistoryItem) => void;
  onBackToPlayer: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  currentUser,
  onRequireAuth,
  onPlayOfflineVideo,
  onPlayEpisodeOnline,
  onDownloadHistoryEpisode,
  onBackToPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'downloads' | 'history'>('downloads');
  const [offlineVideos, setOfflineVideos] = useState<OfflineVideo[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [storageStats, setStorageStats] = useState<{
    totalCount: number;
    totalSizeBytes: number;
    formattedSize: string;
    storageQuotaBytes?: number;
  }>({
    totalCount: 0,
    totalSizeBytes: 0,
    formattedSize: '0 B',
  });

  // Modals & confirmation
  const [pendingDeleteVideo, setPendingDeleteVideo] = useState<OfflineVideo | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = async (text: string, key: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Load offline videos and watch history
  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await getAllOfflineVideos(currentUser?.email);
      const stats = await getOfflineStorageStats();
      const historyList = getWatchHistory(currentUser?.email);

      setOfflineVideos(list);
      setStorageStats(stats);
      setWatchHistory(historyList);
    } catch (err) {
      console.error('Failed to load library data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Filter downloaded videos
  const filteredDownloads = offlineVideos.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries =
      selectedSeriesFilter === 'all' || item.seriesId === selectedSeriesFilter;
    return matchesSearch && matchesSeries;
  });

  // Filter watch history
  const filteredHistory = watchHistory.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries =
      selectedSeriesFilter === 'all' || item.seriesId === selectedSeriesFilter;
    return matchesSearch && matchesSeries;
  });

  // Unique series list in current active tab
  const uniqueSeriesList = Array.from(
    new Map(
      activeTab === 'downloads'
        ? offlineVideos.map((item) => [item.seriesId, item.seriesTitle])
        : watchHistory.map((item) => [item.seriesId, item.seriesTitle])
    ).entries()
  );

  // Delete single offline video
  const handleDeleteVideo = async (episodeId: string) => {
    try {
      await deleteOfflineVideo(episodeId);
      setPendingDeleteVideo(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete offline video:', err);
    }
  };

  // Clear all offline videos
  const handleClearAllDownloads = async () => {
    try {
      await clearAllOfflineVideos();
      setShowClearAllModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to clear offline videos:', err);
    }
  };

  // Delete single history item
  const handleDeleteHistoryItem = (episodeId: string) => {
    const updated = removeWatchHistoryItem(episodeId, currentUser?.email);
    setWatchHistory(updated);
  };

  // Clear all watch history
  const handleClearAllHistory = () => {
    clearWatchHistory(currentUser?.email);
    setWatchHistory([]);
    setShowClearHistoryModal(false);
  };

  // Export saved blob to device download
  const handleExportToDisk = (item: OfflineVideo) => {
    if (!item.videoBlob) return;
    const cleanSeries = item.seriesTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanSeries}_S${String(item.seasonNumber).padStart(2, '0')}E${String(
      item.episodeNumber
    ).padStart(2, '0')}_${cleanTitle}.mp4`;

    const url = URL.createObjectURL(item.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Title Header */}
      <div className="bg-[#121626] border border-[#212942] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-950/50 shrink-0">
              {activeTab === 'downloads' ? <Download className="w-6 h-6" /> : <History className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeTab === 'downloads' ? 'My Downloads & Offline Library' : 'Watch History (Dekhi Hui Videos)'}
                </h1>
                {currentUser ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    <span>Account Synced ({currentUser.name})</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Guest Mode
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {activeTab === 'downloads'
                  ? 'Access your offline saved videos and export them to Laptop or Mobile anytime.'
                  : 'Track all episodes and videos you have watched across your registered account.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={loadData}
              className="p-2 bg-[#191f33] hover:bg-[#232b45] text-gray-300 hover:text-white rounded-xl border border-[#283350] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {activeTab === 'downloads' && offlineVideos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 border border-red-900/40 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Downloads</span>
              </button>
            )}

            {activeTab === 'history' && watchHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearHistoryModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 border border-red-900/40 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToPlayer}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-950/50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Back to Player</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: Downloads vs Watch History */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#1e273e]">
          <button
            type="button"
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'downloads'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-[#151a2c] text-gray-400 hover:text-white hover:bg-[#1e263e]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Downloaded Videos</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'downloads' ? 'bg-black/30 text-white' : 'bg-[#222c44] text-gray-400'
              }`}
            >
              {offlineVideos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-[#151a2c] text-gray-400 hover:text-white hover:bg-[#1e263e]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Watch History (Dekhi Hui Videos)</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'history' ? 'bg-black/30 text-white' : 'bg-[#222c44] text-gray-400'
              }`}
            >
              {watchHistory.length}
            </span>
          </button>
        </div>

        {/* Storage status bar (for downloads tab) */}
        {activeTab === 'downloads' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-[#0c0f1a] border border-[#1e253c] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600/20 text-red-400 shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Offline Videos
                </div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {storageStats.totalCount} {storageStats.totalCount === 1 ? 'Video' : 'Videos'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c0f1a] border border-[#1e253c] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Storage Used
                </div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {storageStats.formattedSize}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c0f1a] border border-[#1e253c] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Offline Mode
                </div>
                <div className="text-xs font-bold text-emerald-400">100% Ready</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest Notice with Sign In / Register Prompt */}
      {!currentUser && (
        <div className="p-4 bg-gradient-to-r from-red-950/40 via-[#181d2e] to-[#121624] border border-red-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Sign In / Register Your Account</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  Sync History & Downloads
                </span>
              </h4>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Agar aap ne pehle register kiya hua hai to apna account login karein, aap ki dekhi hui videos aur downloads wapis load ho jayenge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors shrink-0 shadow-md shadow-red-950/50 flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login / Register Account</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111422] p-3 rounded-2xl border border-[#20273d]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'downloads'
                ? 'Search downloaded videos...'
                : 'Search watched episodes in history...'
            }
            className="w-full bg-[#0c0f1a] border border-[#252f4a] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {uniqueSeriesList.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-red-500" /> Filter Playlist:
            </label>
            <select
              value={selectedSeriesFilter}
              onChange={(e) => setSelectedSeriesFilter(e.target.value)}
              className="bg-[#0c0f1a] text-xs text-gray-200 border border-[#252f4a] rounded-xl px-3 py-2 focus:outline-none focus:border-red-500 transition-colors w-full sm:w-auto"
            >
              <option value="all">
                All Playlists ({activeTab === 'downloads' ? offlineVideos.length : watchHistory.length})
              </option>
              {uniqueSeriesList.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 space-y-3 bg-[#111422] rounded-2xl border border-[#20273d]">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading data...</p>
        </div>
      ) : activeTab === 'downloads' ? (
        /* DOWNLOADS TAB */
        filteredDownloads.length === 0 ? (
          <div className="p-10 sm:p-12 text-center bg-[#111422] rounded-2xl border border-[#20273d] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#191f33] border border-[#283350] flex items-center justify-center mx-auto text-gray-400">
              <Download className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Downloaded Videos Found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                {searchQuery || selectedSeriesFilter !== 'all'
                  ? 'No downloaded videos match your search query or filter.'
                  : 'You have not downloaded any videos to your browser storage yet. Click the Download button on any episode to save it offline.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToPlayer}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50"
            >
              <span>Browse Videos to Download</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDownloads.map((video) => (
              <div
                key={video.id}
                className="bg-[#111524] border border-[#232b42] hover:border-red-500/40 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail / Poster */}
                  <div className="relative aspect-video bg-[#0c0e18] overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Film className="w-10 h-10 text-gray-600" />
                      </div>
                    )}

                    {/* Play Overlay Button */}
                    <button
                      type="button"
                      onClick={() => onPlayOfflineVideo(video)}
                      className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity"
                      title="Play Offline Video"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </button>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                        Offline Ready
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-white border border-white/20">
                        {formatBytes(video.sizeBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider truncate">
                        {video.seriesTitle} • S{video.seasonNumber} E{video.episodeNumber}
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1 mt-0.5">{video.title}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono pt-1 border-t border-[#1d2438]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{new Date(video.downloadedAt).toLocaleDateString()}</span>
                      </span>
                      <span>•</span>
                      <span className="text-gray-300 font-semibold">{video.quality || '1080p HD'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-[#0d101b] border-t border-[#1e253c] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onPlayOfflineVideo(video)}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play Offline</span>
                  </button>

                  {(video.originalUrl || video.blobUrl) && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(video.originalUrl || video.blobUrl || '', `video-${video.id}`)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        copiedKey === `video-${video.id}`
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#171d2e] hover:bg-[#202840] text-gray-300 hover:text-white border-[#27324c]'
                      }`}
                      title="Copy Video URL"
                    >
                      {copiedKey === `video-${video.id}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExportToDisk(video)}
                    className="p-1.5 bg-[#171d2e] hover:bg-[#202840] text-gray-300 hover:text-white rounded-lg border border-[#27324c] transition-colors"
                    title="Export to Laptop / Mobile Storage"
                  >
                    <Laptop className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDeleteVideo(video)}
                    className="p-1.5 bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 rounded-lg border border-red-900/40 transition-colors"
                    title="Delete from Website Storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* WATCH HISTORY TAB ("Dekhi Hui Videos") */
        filteredHistory.length === 0 ? (
          <div className="p-10 sm:p-12 text-center bg-[#111422] rounded-2xl border border-[#20273d] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#191f33] border border-[#283350] flex items-center justify-center mx-auto text-gray-400">
              <History className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Watched Videos Yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                {searchQuery || selectedSeriesFilter !== 'all'
                  ? 'No watch history matches your filter.'
                  : 'Videos you watch will automatically be saved to your account history so you can resume anytime.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToPlayer}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50"
            >
              <span>Start Watching Videos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map((item) => {
              const hasProgress =
                item.durationSeconds && item.durationSeconds > 0 && item.currentTimeSeconds;
              const progressPct = hasProgress
                ? Math.min(100, Math.round(((item.currentTimeSeconds || 0) / (item.durationSeconds || 1)) * 100))
                : 0;

              return (
                <div
                  key={item.id}
                  className="bg-[#111524] border border-[#232b42] hover:border-red-500/40 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-[#0c0e18] overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Film className="w-10 h-10 text-gray-600" />
                        </div>
                      )}

                      {/* Play overlay */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onPlayEpisodeOnline) {
                            onPlayEpisodeOnline(item.seriesId, item.seasonId, item.episodeId);
                          } else {
                            onBackToPlayer();
                          }
                        }}
                        className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity"
                        title="Resume Playing Video"
                      >
                        <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </button>

                      {/* Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {item.completed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Watched</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-red-400 border border-red-500/30">
                            In Progress
                          </span>
                        )}
                      </div>

                      {/* Watch progress bar at bottom of thumbnail */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
                          <div
                            className="h-full bg-red-600"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2.5">
                      <div>
                        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider truncate">
                          {item.seriesTitle} • S{item.seasonNumber} E{item.episodeNumber}
                        </div>
                        <h3 className="text-sm font-bold text-white line-clamp-1 mt-0.5">{item.title}</h3>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono pt-1 border-t border-[#1d2438]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{new Date(item.lastWatchedAt).toLocaleDateString()}</span>
                        </span>
                        {progressPct > 0 && (
                          <span className="text-gray-300 font-semibold">{progressPct}% watched</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 bg-[#0d101b] border-t border-[#1e253c] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onPlayEpisodeOnline) {
                          onPlayEpisodeOnline(item.seriesId, item.seasonId, item.episodeId);
                        } else {
                          onBackToPlayer();
                        }
                      }}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{item.completed ? 'Watch Again' : 'Resume Video'}</span>
                    </button>

                    {item.videoUrl && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.videoUrl, `history-${item.episodeId}`)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          copiedKey === `history-${item.episodeId}`
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : 'bg-[#171d2e] hover:bg-[#202840] text-gray-300 hover:text-white border-[#27324c]'
                        }`}
                        title="Copy Video URL"
                      >
                        {copiedKey === `history-${item.episodeId}` ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {onDownloadHistoryEpisode && (
                      <button
                        type="button"
                        onClick={() => onDownloadHistoryEpisode(item)}
                        className="p-1.5 bg-[#171d2e] hover:bg-[#202840] text-gray-300 hover:text-white rounded-lg border border-[#27324c] transition-colors"
                        title="Download Video"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.episodeId)}
                      className="p-1.5 bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 rounded-lg border border-red-900/40 transition-colors"
                      title="Remove from Watch History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Delete Single Offline Video Modal */}
      {pendingDeleteVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121626] border border-red-900/40 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <span>Delete Offline Video</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteVideo(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0f1a] border border-[#1e253c] space-y-1">
              <div className="text-xs font-bold text-red-400">
                {pendingDeleteVideo.seriesTitle} • S{pendingDeleteVideo.seasonNumber} E{pendingDeleteVideo.episodeNumber}
              </div>
              <div className="text-sm font-semibold text-white">{pendingDeleteVideo.title}</div>
            </div>

            <p className="text-xs text-gray-300">
              Are you sure you want to delete this saved video from your website storage?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteVideo(null)}
                className="px-4 py-2 bg-[#171d2e] hover:bg-[#222b42] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVideo(pendingDeleteVideo.episodeId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow"
              >
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Downloads Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121626] border border-red-900/40 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <span>Clear All Downloads</span>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Are you sure you want to delete all {offlineVideos.length} offline saved videos from your browser storage? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-[#171d2e] hover:bg-[#222b42] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllDownloads}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow"
              >
                Clear All ({offlineVideos.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Watch History Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121626] border border-red-900/40 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/40">
                  <History className="w-5 h-5 text-red-400" />
                </div>
                <span>Clear Watch History</span>
              </div>
              <button
                type="button"
                onClick={() => setShowClearHistoryModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Are you sure you want to clear your entire watch history ({watchHistory.length} episodes)?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryModal(false)}
                className="px-4 py-2 bg-[#171d2e] hover:bg-[#222b42] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow"
              >
                Clear All History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
