import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  X,
  Share2,
  Tv,
  Film,
  Link,
  Layers,
  FileText,
  QrCode,
  Download,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Series, Season, Episode } from '../types';
import { copyToClipboard } from '../utils/clipboard';

interface ShareUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: Series | null;
  currentSeason: Season | null;
  currentEpisode: Episode | null;
}

export const ShareUrlModal: React.FC<ShareUrlModalProps> = ({
  isOpen,
  onClose,
  series,
  currentSeason,
  currentEpisode,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'season' | 'playlist'>('video');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(currentSeason?.id || '');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentSeason?.id) {
      setSelectedSeasonId(currentSeason.id);
    } else if (series?.seasons[0]?.id) {
      setSelectedSeasonId(series.seasons[0].id);
    }
  }, [currentSeason, series]);

  // Derive URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  
  // Direct video stream URL
  const directVideoUrl = currentEpisode?.videoUrl || '';
  
  // Web share link for this specific video
  const webVideoShareUrl = series && currentSeason && currentEpisode
    ? `${baseUrl}?series=${encodeURIComponent(series.id)}&season=${encodeURIComponent(currentSeason.id)}&episode=${encodeURIComponent(currentEpisode.id)}`
    : baseUrl;

  // Active Season Object in Modal
  const activeModalSeason = series?.seasons?.find((s) => s.id === selectedSeasonId) || currentSeason || series?.seasons[0] || null;

  // Web share link for specific Season
  const webSeasonShareUrl = series && activeModalSeason
    ? `${baseUrl}?series=${encodeURIComponent(series.id)}&season=${encodeURIComponent(activeModalSeason.id)}`
    : baseUrl;

  // All video stream links in active Season
  const activeSeasonEpisodes = activeModalSeason?.episodes.map((ep) => ({
    seasonTitle: activeModalSeason.title,
    seasonNum: activeModalSeason.seasonNumber,
    episodeNum: ep.episodeNumber,
    title: ep.title,
    url: ep.videoUrl,
  })) || [];

  const formattedSeasonUrlsText = activeSeasonEpisodes
    .map(
      (ep) =>
        `# S${String(ep.seasonNum).padStart(2, '0')}E${String(ep.episodeNum).padStart(2, '0')} - ${ep.title}\n${ep.url}`
    )
    .join('\n\n');

  // Web share link for the whole playlist
  const webPlaylistShareUrl = series
    ? `${baseUrl}?series=${encodeURIComponent(series.id)}`
    : baseUrl;

  // All video stream links in current playlist/series
  const allPlaylistEpisodes = series?.seasons?.flatMap((s) =>
    s.episodes.map((ep) => ({
      seasonTitle: s.title,
      seasonNum: s.seasonNumber,
      episodeNum: ep.episodeNumber,
      title: ep.title,
      url: ep.videoUrl,
    }))
  ) || [];

  const formattedAllUrlsText = allPlaylistEpisodes
    .map(
      (ep) =>
        `# S${String(ep.seasonNum).padStart(2, '0')}E${String(ep.episodeNum).padStart(2, '0')} - ${ep.title}\n${ep.url}`
    )
    .join('\n\n');

  // Generate QR Code for mobile sharing
  useEffect(() => {
    if (!isOpen) return;
    let urlToEncode = webPlaylistShareUrl;
    if (activeTab === 'video') {
      urlToEncode = directVideoUrl || webVideoShareUrl;
    } else if (activeTab === 'season') {
      urlToEncode = webSeasonShareUrl;
    } else {
      urlToEncode = webPlaylistShareUrl;
    }

    if (urlToEncode) {
      QRCode.toDataURL(urlToEncode, {
        width: 200,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((res) => setQrCodeDataUrl(res))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, activeTab, directVideoUrl, webVideoShareUrl, webSeasonShareUrl, webPlaylistShareUrl]);

  if (!isOpen || !series) return null;

  const handleCopy = async (text: string, type: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleExportSeasonFile = () => {
    if (!series || !activeModalSeason) return;
    const cleanTitle = `${series.title}_${activeModalSeason.title || `Season_${activeModalSeason.seasonNumber}`}`.replace(/[^a-zA-Z0-9]/g, '_');
    const blob = new Blob([formattedSeasonUrlsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_Episode_URLs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleExportPlaylistFile = () => {
    if (!series) return;
    const cleanTitle = series.title.replace(/[^a-zA-Z0-9]/g, '_');
    const blob = new Blob([formattedAllUrlsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_All_Episode_URLs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101422] border border-[#232b42] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181d2f] via-[#141828] to-[#0f121e] border-b border-[#212940] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Copy & Share URLs</h2>
              <p className="text-xs text-gray-400">Copy playlist link, video stream URL, or all episode links</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Video URL vs Season URL vs Playlist URL */}
        <div className="flex items-center p-2 bg-[#0b0e18] border-b border-[#1b2236] gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'video'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'bg-[#131726] text-gray-400 hover:text-white hover:bg-[#1c2236]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('season')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'season'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'bg-[#131726] text-gray-400 hover:text-white hover:bg-[#1c2236]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Season URLs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playlist')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'playlist'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'bg-[#131726] text-gray-400 hover:text-white hover:bg-[#1c2236]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Playlist URLs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'video' ? (
            /* VIDEO URL TAB */
            <div className="space-y-4">
              {currentEpisode ? (
                <>
                  {/* Episode Summary Card */}
                  <div className="p-3.5 rounded-2xl bg-[#0c0f1a] border border-[#1e273e] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 font-bold font-mono text-xs">
                      E{currentEpisode.episodeNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-red-400 truncate">
                        {series.title} • {currentSeason?.title || `Season ${currentSeason?.seasonNumber || 1}`}
                      </div>
                      <div className="text-sm font-bold text-white truncate">{currentEpisode.title}</div>
                    </div>
                  </div>

                  {/* 1. Direct Video Stream Link */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-red-400" />
                        <span>Direct Video Stream URL:</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {currentEpisode.videoFormat || 'Auto'} • {currentEpisode.quality || 'HD'}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={directVideoUrl}
                        className="flex-1 bg-[#0a0d17] border border-[#232b42] rounded-xl px-3 py-2.5 text-xs text-gray-200 font-mono focus:outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(directVideoUrl, 'direct-video')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow ${
                          copiedType === 'direct-video'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
                        }`}
                      >
                        {copiedType === 'direct-video' ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Video URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. Web Player Share Link */}
                  <div className="space-y-1.5 pt-2 border-t border-[#1a2136]">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Web Page Link (Plays this Episode Directly):</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webVideoShareUrl}
                        className="flex-1 bg-[#0a0d17] border border-[#232b42] rounded-xl px-3 py-2.5 text-xs text-gray-200 font-mono focus:outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(webVideoShareUrl, 'web-video')}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                          copiedType === 'web-video'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : 'bg-[#171d2e] hover:bg-[#222a42] text-gray-200 border-[#27324c]'
                        }`}
                      >
                        {copiedType === 'web-video' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-gray-400" />
                            <span>Copy Share Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">No active episode selected.</div>
              )}
            </div>
          ) : activeTab === 'season' ? (
            /* SEASON URL TAB */
            <div className="space-y-4">
              {/* Season Selection Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#0c0f1a] border border-[#1e273e]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-bold text-gray-200">Select Season:</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="bg-[#151928] text-xs font-semibold text-white border border-[#2b3552] rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {series.seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title || `Season ${s.seasonNumber}`} ({s.episodes.length} Episodes)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportSeasonFile}
                    className="px-3 py-1.5 bg-[#171d2e] hover:bg-[#222a42] text-gray-200 border border-[#27324c] rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    title="Export this season's URLs as .txt file"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Export .txt</span>
                  </button>
                </div>
              </div>

              {/* 1. Shareable Season Web URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-400" />
                  <span>Season Share Link (Web Link):</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webSeasonShareUrl}
                    className="flex-1 bg-[#0a0d17] border border-[#232b42] rounded-xl px-3 py-2.5 text-xs text-gray-200 font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webSeasonShareUrl, 'web-season')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow ${
                      copiedType === 'web-season'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/40'
                    }`}
                  >
                    {copiedType === 'web-season' ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Season URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. All Episode URLs List in this Season */}
              <div className="space-y-1.5 pt-2 border-t border-[#1a2136]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All Video URLs in {activeModalSeason?.title || 'this Season'} ({activeSeasonEpisodes.length} links):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(formattedSeasonUrlsText, 'season-urls')}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border ${
                      copiedType === 'season-urls'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-[#181d2f] hover:bg-[#242b44] text-blue-400 border-[#2b3552]'
                    }`}
                  >
                    {copiedType === 'season-urls' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Season URLs Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Season URLs</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    rows={4}
                    value={formattedSeasonUrlsText || 'No episodes in this season yet.'}
                    className="w-full bg-[#0a0d17] border border-[#232b42] rounded-xl p-3 text-[11px] text-gray-300 font-mono focus:outline-none select-all resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* PLAYLIST URL TAB */
            <div className="space-y-4">
              {/* Playlist Summary Card */}
              <div className="p-3.5 rounded-2xl bg-[#0c0f1a] border border-[#1e273e] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{series.title}</div>
                    <div className="text-[11px] text-gray-400">
                      {series.seasons.length} {series.seasons.length === 1 ? 'Season' : 'Seasons'} • {allPlaylistEpisodes.length} Episodes
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportPlaylistFile}
                  className="px-3 py-1.5 bg-[#171d2e] hover:bg-[#222a42] text-gray-200 border border-[#27324c] rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                  title="Download all video URLs as text file"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Export .txt</span>
                </button>
              </div>

              {/* 1. Shareable Playlist Web URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-red-400" />
                  <span>Playlist Share Link (Web Link):</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webPlaylistShareUrl}
                    className="flex-1 bg-[#0a0d17] border border-[#232b42] rounded-xl px-3 py-2.5 text-xs text-gray-200 font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webPlaylistShareUrl, 'web-playlist')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow ${
                      copiedType === 'web-playlist'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
                    }`}
                  >
                    {copiedType === 'web-playlist' ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Playlist Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. All Episode URLs List in Playlist */}
              <div className="space-y-1.5 pt-2 border-t border-[#1a2136]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All Video URLs in this Playlist ({allPlaylistEpisodes.length} links):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(formattedAllUrlsText, 'all-urls')}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border ${
                      copiedType === 'all-urls'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-[#181d2f] hover:bg-[#242b44] text-red-400 border-[#2b3552]'
                    }`}
                  >
                    {copiedType === 'all-urls' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>All URLs Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy All Video URLs</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    rows={4}
                    value={formattedAllUrlsText}
                    className="w-full bg-[#0a0d17] border border-[#232b42] rounded-xl p-3 text-[11px] text-gray-300 font-mono focus:outline-none select-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* QR Code Quick Scan for Mobile Phone */}
          {qrCodeDataUrl && (
            <div className="p-3.5 rounded-2xl bg-[#090b14] border border-[#1b2236] flex items-center gap-4">
              <div className="p-1.5 bg-white rounded-xl shadow shrink-0">
                <img src={qrCodeDataUrl} alt="Scan QR Code" className="w-18 h-18 sm:w-20 sm:h-20" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-red-400" />
                  <span>Scan with Mobile Camera</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Apne mobile camera se QR code scan karke direct video ya playlist open karein.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0d101c] border-t border-[#1e263d] flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            {copiedType ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> URL successfully copied to clipboard!
              </span>
            ) : (
              <span>Click any button above to copy URL instantly.</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1b2136] hover:bg-[#252e4a] text-white rounded-xl text-xs font-bold transition-colors"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
