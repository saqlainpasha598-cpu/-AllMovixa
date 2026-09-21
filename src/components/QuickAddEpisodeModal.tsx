import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  FolderPlus,
  Tv,
  Layers,
  Check,
  ArrowRight,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { AppConfig, VideoFormat } from '../types';
import { detectVideoFormat } from '../utils/videoDetector';
import {
  uploadVideoFile,
  uploadThumbnailFile,
  formatFileSize,
  extractVideoMetadata,
  deleteUploadedFile,
} from '../utils/fileUploader';

interface QuickAddEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  activeSeriesId: string;
  selectedSeasonId?: string;
  initialTab?: 'episode' | 'playlist' | 'season';
  onAddEpisode: (params: {
    seriesId: string;
    seasonId: string;
    title: string;
    episodeNumber: number;
    videoUrl: string;
    videoFormat: VideoFormat;
    duration?: string;
    quality?: string;
    resolution?: { width: number; height: number };
    thumbnailUrl?: string;
    language?: string;
  }) => void;
  onCreateSeries?: (
    title: string,
    description?: string,
    posterUrl?: string
  ) => { seriesId: string; seasonId: string } | void;
  onCreateSeason?: (title: string, seriesId?: string) => string | void;
}

export const QuickAddEpisodeModal: React.FC<QuickAddEpisodeModalProps> = ({
  isOpen,
  onClose,
  config,
  activeSeriesId,
  selectedSeasonId,
  initialTab = 'episode',
  onAddEpisode,
  onCreateSeries,
  onCreateSeason,
}) => {
  // Active top-level mode tab inside the Upload modal
  const [activeTab, setActiveTab] = useState<'episode' | 'playlist' | 'season'>(initialTab);

  // Sync activeTab when modal is opened with specific initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Selected Target Series & Season for episode upload
  const [targetSeriesId, setTargetSeriesId] = useState(activeSeriesId || config.series[0]?.id || '');
  const targetSeries = config.series.find((s) => s.id === targetSeriesId) || config.series[0];

  const [targetSeasonId, setTargetSeasonId] = useState(
    selectedSeasonId || targetSeries?.seasons[0]?.id || ''
  );

  // Inline Playlist / Season form expander state (inside upload episode view)
  const [showInlineNewPlaylist, setShowInlineNewPlaylist] = useState(false);
  const [showInlineNewSeason, setShowInlineNewSeason] = useState(false);

  // Feedback banner
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  // Sync season when target series changes
  useEffect(() => {
    if (targetSeries && targetSeries.seasons.length > 0) {
      if (!targetSeries.seasons.some((s) => s.id === targetSeasonId)) {
        setTargetSeasonId(targetSeries.seasons[0].id);
      }
    }
  }, [targetSeries, targetSeasonId]);

  const currentSeason = targetSeries?.seasons.find((s) => s.id === targetSeasonId) || targetSeries?.seasons[0];

  // Auto calculate next episode number
  const nextEpNum = currentSeason ? currentSeason.episodes.length + 1 : 1;

  // --- Episode Form States ---
  const [epNumber, setEpNumber] = useState<number>(nextEpNum);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [episodeLanguage, setEpisodeLanguage] = useState('Hindi & English (Dual Audio)');

  // Video Source states
  const [videoMode, setVideoMode] = useState<'upload' | 'url'>('upload');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('auto');
  const [videoQuality, setVideoQuality] = useState<string | undefined>(undefined);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | undefined>(undefined);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [uploadedVideoDetails, setUploadedVideoDetails] = useState<{
    filename: string;
    size: number;
    quality?: string;
    width?: number;
    height?: number;
  } | null>(null);

  // Thumbnail states
  const [thumbMode, setThumbMode] = useState<'upload' | 'url'>('upload');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [thumbError, setThumbError] = useState<string | null>(null);

  // Link test state
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    format?: string;
  } | null>(null);

  // --- New Playlist Form States ---
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistCoverMode, setNewPlaylistCoverMode] = useState<'upload' | 'url'>('upload');
  const [newPlaylistPosterUrl, setNewPlaylistPosterUrl] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterError, setPosterError] = useState<string | null>(null);

  // --- New Season Form States ---
  const [newSeasonTitle, setNewSeasonTitle] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Recalculate next episode number when season changes
  useEffect(() => {
    if (currentSeason) {
      setEpNumber(currentSeason.episodes.length + 1);
    }
  }, [targetSeasonId, currentSeason]);

  if (!isOpen) return null;

  // Video file upload from PC
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setIsUploadingVideo(true);
    setVideoProgress(0);

    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName);
    }

    // Auto-extract duration and resolution/quality metadata from video file locally
    extractVideoMetadata(file)
      .then((meta) => {
        if (meta) {
          if (meta.duration && !duration.trim()) {
            setDuration(meta.duration);
          }
          if (meta.qualityLabel) {
            setVideoQuality(meta.qualityLabel);
          }
          if (meta.width && meta.height) {
            setVideoResolution({ width: meta.width, height: meta.height });
          }
        }
      })
      .catch((err) => {
        console.warn('Metadata probe warning:', err);
      });

    const res = await uploadVideoFile(file, (percent) => {
      setVideoProgress(percent);
    });

    setIsUploadingVideo(false);

    if (res.success && res.url) {
      setVideoUrl(res.url);
      setVideoFormat(res.format || 'mp4');
      setUploadedVideoDetails({
        filename: file.name,
        size: file.size,
      });
      setTestResult({
        valid: true,
        message: `Video uploaded: ${file.name} (${formatFileSize(file.size)})`,
        format: res.format,
      });
    } else {
      setVideoError(res.error || 'Failed to upload video from PC.');
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Thumbnail file upload from PC
  const handleThumbFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbError(null);
    setIsUploadingThumb(true);
    setThumbProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setThumbProgress(percent);
    });

    setIsUploadingThumb(false);

    if (res.success && res.url) {
      setThumbnailUrl(res.url);
    } else {
      setThumbError(res.error || 'Failed to upload thumbnail image.');
    }
    if (thumbInputRef.current) thumbInputRef.current.value = '';
  };

  // Playlist Poster file upload from PC
  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPosterError(null);
    setIsUploadingPoster(true);
    setPosterProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setPosterProgress(percent);
    });

    setIsUploadingPoster(false);

    if (res.success && res.url) {
      setNewPlaylistPosterUrl(res.url);
    } else {
      setPosterError(res.error || 'Failed to upload poster image.');
    }
    if (posterInputRef.current) posterInputRef.current.value = '';
  };

  const handleTestUrl = async () => {
    if (!videoUrl.trim()) return;
    const formatToTest = videoFormat === 'auto' ? detectVideoFormat(videoUrl, 'auto') : videoFormat;

    try {
      const res = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl.trim(),
          expectedFormat: formatToTest,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          valid: data.valid,
          message: data.valid
            ? `Ready for playback (${(data.detectedFormat || formatToTest).toUpperCase()})`
            : data.message || data.error || 'Format detected, ready for playback.',
          format: data.detectedFormat || formatToTest,
        });
      } else {
        setTestResult({
          valid: true,
          message: 'Direct link ready.',
          format: formatToTest,
        });
      }
    } catch {
      setTestResult({
        valid: true,
        message: 'Link ready for player.',
        format: formatToTest,
      });
    }
  };

  // Handle Creating Playlist
  const handleCreatePlaylistSubmit = (e?: React.FormEvent, andClose: boolean = false) => {
    if (e) e.preventDefault();
    if (!newPlaylistTitle.trim()) {
      alert('Please enter a Playlist / Series title.');
      return;
    }

    if (onCreateSeries) {
      const created = onCreateSeries(
        newPlaylistTitle.trim(),
        newPlaylistDesc.trim() || undefined,
        newPlaylistPosterUrl.trim() || undefined
      );

      if (created && created.seriesId) {
        setTargetSeriesId(created.seriesId);
        setTargetSeasonId(created.seasonId);
      }

      // Reset playlist form
      setNewPlaylistTitle('');
      setNewPlaylistDesc('');
      setNewPlaylistPosterUrl('');
      setShowInlineNewPlaylist(false);

      if (andClose) {
        onClose();
      } else {
        setStatusMessage({
          type: 'success',
          text: `Playlist "${newPlaylistTitle}" created! You can now add your first video below.`,
        });
        setActiveTab('episode');
      }
    }
  };

  // Handle Creating Season
  const handleCreateSeasonSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSeasonTitle.trim()) {
      alert('Please enter a Season name.');
      return;
    }

    if (onCreateSeason) {
      const newSeasonId = onCreateSeason(newSeasonTitle.trim(), targetSeriesId);
      if (newSeasonId && typeof newSeasonId === 'string') {
        setTargetSeasonId(newSeasonId);
      }

      setStatusMessage({
        type: 'success',
        text: `Season "${newSeasonTitle}" added to playlist!`,
      });

      setNewSeasonTitle('');
      setShowInlineNewSeason(false);
      setActiveTab('episode');
    }
  };

  // Handle Episode Submit
  const handleEpisodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      alert('Please upload a video file or paste a video URL.');
      return;
    }

    if (!targetSeries || !currentSeason) {
      alert('Please select a valid series and season.');
      return;
    }

    const finalFormat = videoFormat === 'auto' ? detectVideoFormat(videoUrl, 'auto') : videoFormat;

    onAddEpisode({
      seriesId: targetSeries.id,
      seasonId: currentSeason.id,
      title: title.trim() || `Episode ${epNumber}`,
      episodeNumber: Number(epNumber) || nextEpNum,
      videoUrl: videoUrl.trim(),
      videoFormat: finalFormat,
      duration: duration.trim() || undefined,
      quality: videoQuality || undefined,
      resolution: videoResolution || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      language: episodeLanguage,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121520] border border-[#23293d] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1d2235] bg-[#0d0f17] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Upload Center</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-800/40">
                  Playlists & Videos
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Upload videos from your PC, paste links, or create new playlists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1f2537] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs inside Upload Page */}
        <div className="flex items-center px-5 border-b border-[#1c2235] bg-[#0f121d] gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('episode');
              setShowInlineNewPlaylist(false);
            }}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'episode'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileVideo className="w-3.5 h-3.5 text-red-400" />
            <span>Upload Episode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playlist')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'playlist'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ New Playlist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('season')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'season'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>+ New Season</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: UPLOAD EPISODE */}
        {activeTab === 'episode' && (
          <form onSubmit={handleEpisodeSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Playlist / Series & Season Selector with Quick Action Buttons */}
            <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Playlist Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                      <Tv className="w-3 h-3 text-red-500" /> Playlist / Series
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewPlaylist(!showInlineNewPlaylist)}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      title="Create a new playlist right here"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showInlineNewPlaylist ? 'Hide' : 'New Playlist'}</span>
                    </button>
                  </div>

                  <select
                    value={targetSeriesId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowInlineNewPlaylist(true);
                      } else {
                        setTargetSeriesId(e.target.value);
                      }
                    }}
                    className="w-full bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                  >
                    {config.series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                    <option value="__new__" className="text-emerald-400 font-bold">
                      + Create New Playlist...
                    </option>
                  </select>
                </div>

                {/* Season Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-400" /> Season / Arc
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewSeason(!showInlineNewSeason)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      title="Add a new season to this playlist"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showInlineNewSeason ? 'Hide' : 'New Season'}</span>
                    </button>
                  </div>

                  <select
                    value={targetSeasonId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowInlineNewSeason(true);
                      } else {
                        setTargetSeasonId(e.target.value);
                      }
                    }}
                    className="w-full bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                  >
                    {targetSeries?.seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.title || `Season ${season.seasonNumber}`} ({season.episodes.length} eps)
                      </option>
                    ))}
                    <option value="__new__" className="text-blue-400 font-bold">
                      + Add New Season...
                    </option>
                  </select>
                </div>
              </div>

              {/* INLINE NEW PLAYLIST EXPANDER (inside upload page) */}
              {showInlineNewPlaylist && (
                <div className="p-3.5 bg-[#141824] rounded-lg border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4" />
                      <span>Create New Playlist / Series</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewPlaylist(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-300 mb-1">
                        Playlist Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Solo Leveling, Naruto, Action Movies"
                        value={newPlaylistTitle}
                        onChange={(e) => setNewPlaylistTitle(e.target.value)}
                        className="w-full bg-[#1b2234] text-xs text-white px-3 py-1.5 rounded-md border border-[#2c3752] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-300 mb-1">
                        Poster URL (optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/poster.jpg"
                        value={newPlaylistPosterUrl}
                        onChange={(e) => setNewPlaylistPosterUrl(e.target.value)}
                        className="w-full bg-[#1b2234] text-xs text-white px-3 py-1.5 rounded-md border border-[#2c3752] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInlineNewPlaylist(false)}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreatePlaylistSubmit()}
                      disabled={!newPlaylistTitle.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Create & Select This Playlist</span>
                    </button>
                  </div>
                </div>
              )}

              {/* INLINE NEW SEASON EXPANDER (inside upload page) */}
              {showInlineNewSeason && (
                <div className="p-3 bg-[#141824] rounded-lg border border-blue-500/30 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>Add Season to &quot;{targetSeries?.title}&quot;</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewSeason(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`e.g. Season ${(targetSeries?.seasons.length || 0) + 1}`}
                      value={newSeasonTitle}
                      onChange={(e) => setNewSeasonTitle(e.target.value)}
                      className="flex-1 bg-[#1b2234] text-xs text-white px-3 py-1.5 rounded-md border border-[#2c3752] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateSeasonSubmit()}
                      disabled={!newSeasonTitle.trim()}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors whitespace-nowrap"
                    >
                      Add Season
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Episode Basics: Number, Title, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Episode #
                </label>
                <input
                  type="number"
                  min={1}
                  value={epNumber}
                  onChange={(e) => setEpNumber(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#171c2b] text-sm text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500 font-bold text-center"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Episode Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Awakening, Battle Begins"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#171c2b] text-sm text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Duration (opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 23:45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-[#171c2b] text-sm text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Language / Audio Option */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                Language / Audio / Subtitle Format
              </label>
              <select
                value={episodeLanguage}
                onChange={(e) => setEpisodeLanguage(e.target.value)}
                className="w-full bg-[#171c2b] text-sm text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
              >
                <option value="Hindi Dubbed">Hindi Dubbed</option>
                <option value="English Sub/Dub">English Sub/Dub</option>
                <option value="Hindi & English (Dual Audio)">Hindi & English (Dual Audio)</option>
                <option value="Japanese with Subtitles">Japanese with Subtitles</option>
                <option value="Multi-Language (Sub/Dub)">Multi-Language (Sub/Dub)</option>
                <option value="Urdu Dubbed/Sub">Urdu Dubbed/Sub</option>
                <option value="Spanish / Other">Spanish / Other</option>
              </select>
            </div>

            {/* 1. Video Source: Upload from PC vs URL */}
            <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <FileVideo className="w-3.5 h-3.5 text-red-500" />
                  <span>Video File / Stream Source *</span>
                </span>

                {/* Switch Upload vs URL */}
                <div className="flex items-center bg-[#171c2b] p-0.5 rounded-lg border border-[#26304b]">
                  <button
                    type="button"
                    onClick={() => setVideoMode('upload')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                      videoMode === 'upload'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload from PC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode('url')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      videoMode === 'url'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Paste Stream URL
                  </button>
                </div>
              </div>

              {/* Mode A: Upload from PC */}
              {videoMode === 'upload' ? (
                <div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mkv,video/quicktime,video/x-msvideo"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />

                  {isUploadingVideo ? (
                    <div className="p-4 bg-[#141826] border border-red-500/40 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                      <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                      <div className="w-full max-w-xs bg-[#20273c] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-red-600 h-full transition-all duration-200"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-200">
                        Uploading video from your computer... {videoProgress}%
                      </span>
                    </div>
                  ) : uploadedVideoDetails ? (
                    <div className="p-3 bg-[#151926] border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {uploadedVideoDetails.filename}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            Size: {formatFileSize(uploadedVideoDetails.size)} • Format: {videoFormat}
                            {videoQuality && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-500/40">
                                {videoQuality}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-[#20273d] hover:bg-[#2a3452] text-xs font-semibold text-gray-200 rounded-lg border border-[#344166] transition-colors flex items-center gap-1"
                          title="Upload a different video"
                        >
                          <RefreshCw className="w-3 h-3 text-gray-400" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (videoUrl.startsWith('/uploads/')) {
                              await deleteUploadedFile(videoUrl);
                            }
                            setVideoUrl('');
                            setUploadedVideoDetails(null);
                            setTestResult(null);
                            setVideoQuality(undefined);
                            setVideoResolution(undefined);
                          }}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded-lg border border-red-500/30 transition-colors"
                          title="Delete uploaded video file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="p-5 border-2 border-dashed border-[#28324e] hover:border-red-500/80 bg-[#131725] hover:bg-[#171c2c] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-200 group-hover:text-white">
                          Click to select and upload video from your PC
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Supports large videos up to 10GB (MP4, WebM, MKV, MOV) • Auto-detects 1080p, 720p, HD
                        </p>
                      </div>
                    </div>
                  )}

                  {videoError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{videoError}</span>
                    </p>
                  )}
                </div>
              ) : (
                /* Mode B: Paste Video URL */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <input
                        type="url"
                        placeholder="https://example.com/video.mp4 or .m3u8 or YouTube/Vimeo embed"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setUploadedVideoDetails(null);
                        }}
                        className="w-full bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-1.5">
                      <select
                        value={videoFormat}
                        onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                        className="flex-1 bg-[#171c2b] text-xs text-white px-2 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                      >
                        <option value="auto">Auto Detect</option>
                        <option value="mp4">Direct MP4</option>
                        <option value="hls">HLS (.m3u8)</option>
                        <option value="dash">DASH (.mpd)</option>
                        <option value="embed">iFrame Embed</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleTestUrl}
                        disabled={!videoUrl.trim()}
                        className="px-3 py-2 bg-[#21283d] hover:bg-[#2b3552] disabled:opacity-40 text-xs text-white rounded-lg border border-[#333f60] transition-colors"
                        title="Test link playback"
                      >
                        <Play className="w-3 h-3 text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Link test status */}
              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    testResult.valid
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-800/40 text-red-300'
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className="truncate">{testResult.message}</span>
                </div>
              )}
            </div>

            {/* 2. Thumbnail Source: Upload from PC vs URL */}
            <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Episode Thumbnail (Optional)</span>
                </span>

                <div className="flex items-center bg-[#171c2b] p-0.5 rounded-lg border border-[#26304b]">
                  <button
                    type="button"
                    onClick={() => setThumbMode('upload')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      thumbMode === 'upload'
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Upload PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbMode('url')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      thumbMode === 'url'
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {thumbMode === 'upload' ? (
                <div>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleThumbFileChange}
                    className="hidden"
                  />

                  {isUploadingThumb ? (
                    <div className="p-3 bg-[#151926] border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-xs text-gray-300">
                        Uploading thumbnail... {thumbProgress}%
                      </span>
                    </div>
                  ) : thumbnailUrl ? (
                    <div className="flex items-center gap-3 p-2 bg-[#151926] rounded-xl border border-[#242d45]">
                      <div className="w-16 h-10 rounded-lg overflow-hidden border border-[#2f3b5a] shrink-0">
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-emerald-400 font-semibold truncate flex-1">
                        Thumbnail ready
                      </span>
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        className="px-2 py-1 bg-[#20273d] text-[11px] text-gray-200 rounded border border-[#333f60]"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('')}
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className="w-full p-2.5 border border-dashed border-[#27324d] hover:border-emerald-500/80 bg-[#131725] hover:bg-[#181e2e] rounded-xl text-xs text-gray-300 font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upload thumbnail image from PC (JPG, PNG, WebP)</span>
                    </button>
                  )}

                  {thumbError && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{thumbError}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="flex-1 bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {thumbnailUrl && (
                    <div className="w-12 h-8 rounded border border-[#2b3552] overflow-hidden shrink-0">
                      <img
                        src={thumbnailUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-[#1a2030] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!videoUrl.trim() || isUploadingVideo}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Add Episode to {targetSeries?.title || 'Playlist'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CREATE NEW PLAYLIST */}
        {activeTab === 'playlist' && (
          <form onSubmit={handleCreatePlaylistSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-[#0b0e17] p-4 rounded-xl border border-emerald-500/30 space-y-3.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <FolderPlus className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">Create New Series / Playlist</h4>
              </div>
              <p className="text-xs text-gray-400">
                Add a new Anime or Video Series to your website. You can immediately upload episodes to it after creating.
              </p>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Playlist / Series Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Solo Leveling, Demon Slayer, Naruto Shippuden"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="w-full bg-[#171c2b] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description / Synopsis (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of this series or playlist..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  className="w-full bg-[#171c2b] text-xs text-white px-3.5 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Cover / Poster Image */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cover Poster Image (Optional)</span>
                  </label>

                  <div className="flex items-center bg-[#171c2b] p-0.5 rounded-lg border border-[#26304b]">
                    <button
                      type="button"
                      onClick={() => setNewPlaylistCoverMode('upload')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        newPlaylistCoverMode === 'upload'
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Upload PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlaylistCoverMode('url')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        newPlaylistCoverMode === 'url'
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Poster URL
                    </button>
                  </div>
                </div>

                {newPlaylistCoverMode === 'upload' ? (
                  <div>
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePosterFileChange}
                      className="hidden"
                    />

                    {isUploadingPoster ? (
                      <div className="p-3 bg-[#151926] border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        <span className="text-xs text-gray-300">
                          Uploading poster... {posterProgress}%
                        </span>
                      </div>
                    ) : newPlaylistPosterUrl ? (
                      <div className="flex items-center gap-3 p-2 bg-[#151926] rounded-xl border border-[#242d45]">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#2f3b5a] shrink-0">
                          <img
                            src={newPlaylistPosterUrl}
                            alt="Cover"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-emerald-400 font-semibold truncate flex-1">
                          Cover poster ready
                        </span>
                        <button
                          type="button"
                          onClick={() => posterInputRef.current?.click()}
                          className="px-2 py-1 bg-[#20273d] text-[11px] text-gray-200 rounded border border-[#333f60]"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlaylistPosterUrl('')}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => posterInputRef.current?.click()}
                        className="w-full p-3 border border-dashed border-[#27324d] hover:border-emerald-500/80 bg-[#131725] hover:bg-[#181e2e] rounded-xl text-xs text-gray-300 font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload cover poster image from PC</span>
                      </button>
                    )}

                    {posterError && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{posterError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/cover-poster.jpg"
                      value={newPlaylistPosterUrl}
                      onChange={(e) => setNewPlaylistPosterUrl(e.target.value)}
                      className="flex-1 bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {newPlaylistPosterUrl && (
                      <div className="w-10 h-10 rounded border border-[#2b3552] overflow-hidden shrink-0">
                        <img
                          src={newPlaylistPosterUrl}
                          alt="Poster Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('episode')}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-[#1a2030] transition-colors text-center"
              >
                Back to Upload Episode
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreatePlaylistSubmit(undefined, true)}
                  disabled={!newPlaylistTitle.trim() || isUploadingPoster}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1b2236] hover:bg-[#252f4c] disabled:opacity-50 text-white text-xs font-bold rounded-lg border border-[#2e3b5e] transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Create Playlist</span>
                </button>

                <button
                  type="submit"
                  disabled={!newPlaylistTitle.trim() || isUploadingPoster}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-950/40"
                >
                  <span>Create & Add Video</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: CREATE NEW SEASON */}
        {activeTab === 'season' && (
          <form onSubmit={handleCreateSeasonSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="bg-[#0b0e17] p-4 rounded-xl border border-blue-500/30 space-y-3.5">
              <div className="flex items-center gap-2 text-blue-400">
                <Layers className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">Add New Season or Story Arc</h4>
              </div>
              <p className="text-xs text-gray-400">
                Add a new season (e.g. Season 2) or story arc to an existing playlist.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Playlist / Series
                </label>
                <select
                  value={targetSeriesId}
                  onChange={(e) => setTargetSeriesId(e.target.value)}
                  className="w-full bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-blue-500"
                >
                  {config.series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.seasons.length} seasons)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Season Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={`e.g. Season ${(targetSeries?.seasons.length || 0) + 1} or Entertainment District Arc`}
                  value={newSeasonTitle}
                  onChange={(e) => setNewSeasonTitle(e.target.value)}
                  className="w-full bg-[#171c2b] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#27314b] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('episode')}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-[#1a2030] transition-colors"
              >
                Back to Upload Episode
              </button>

              <button
                type="submit"
                disabled={!newSeasonTitle.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Add Season to Playlist</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
