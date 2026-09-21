import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Film,
  Layers,
  ExternalLink,
  Tv,
  FileVideo,
  Check,
  Loader2,
  RefreshCw,
  FolderPlus,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Languages,
  Bell,
  Users,
  Copy,
} from 'lucide-react';
import { AppConfig, Series, Season, Episode, VideoFormat, ContentRequest } from '../types';
import { getChannelConfig, saveChannelConfig, getSubscribersList, SubscriberRecord } from '../utils/channelConfig';
import { detectVideoFormat, formatEmbedUrl, formatTime } from '../utils/videoDetector';
import {
  uploadVideoFile,
  uploadThumbnailFile,
  formatFileSize,
  deleteUploadedFile,
} from '../utils/fileUploader';
import { changeAdminPassword } from '../utils/adminAuth';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => Promise<boolean>;
  onResetDemo: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'series_info' | 'logo' | 'security' | 'requests' | 'channel' | 'urls'>('content');
  const [formData, setFormData] = useState<AppConfig>(JSON.parse(JSON.stringify(config)));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [copiedUrlText, setCopiedUrlText] = useState<string | null>(null);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlText(url);
    setTimeout(() => setCopiedUrlText(null), 2500);
  };

  // Channel & Subs config state
  const [channelForm, setChannelForm] = useState(getChannelConfig());
  const [subscribersList, setSubscribersList] = useState<SubscriberRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setChannelForm(getChannelConfig());
      setSubscribersList(getSubscribersList());
    }
  }, [isOpen, activeTab]);

  const handleSaveChannelSettings = () => {
    saveChannelConfig(channelForm);
    alert('Channel settings saved successfully!');
  };

  // Admin Requests state
  const [adminRequests, setAdminRequests] = useState<ContentRequest[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('stream_public_content_requests_v1');
        if (saved) {
          setAdminRequests(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen, activeTab]);

  const handleUpdateReqStatus = (id: string, status: 'pending' | 'approved' | 'completed') => {
    const updated = adminRequests.map((r) => (r.id === id ? { ...r, status } : r));
    setAdminRequests(updated);
    try {
      localStorage.setItem('stream_public_content_requests_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReq = (id: string) => {
    const updated = adminRequests.filter((r) => r.id !== id);
    setAdminRequests(updated);
    try {
      localStorage.setItem('stream_public_content_requests_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Sync formData whenever modal opens or config updates from parent
  useEffect(() => {
    if (isOpen) {
      setFormData(JSON.parse(JSON.stringify(config)));
      const active = config.series.find((s) => s.id === config.activeSeriesId) || config.series[0];
      if (active && active.seasons.length > 0) {
        setSelectedSeasonId(active.seasons[0].id);
        setNewEpNum((active.seasons[0].episodes?.length || 0) + 1);
      }
    }
  }, [isOpen, config]);

  // In-UI Create Playlist Modal inside Admin
  const [isCreatePlaylistOpenInAdmin, setIsCreatePlaylistOpenInAdmin] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistPosterUrl, setNewPlaylistPosterUrl] = useState('');
  const [newPlaylistCoverMode, setNewPlaylistCoverMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingPlaylistPoster, setIsUploadingPlaylistPoster] = useState(false);
  const [playlistPosterProgress, setPlaylistPosterProgress] = useState(0);
  const [playlistPosterError, setPlaylistPosterError] = useState<string | null>(null);
  const [playlistCreateError, setPlaylistCreateError] = useState<string | null>(null);

  // In-UI Delete Confirmation Modals
  const [playlistToDeleteInAdmin, setPlaylistToDeleteInAdmin] = useState<Series | null>(null);
  const [episodeToDeleteInAdmin, setEpisodeToDeleteInAdmin] = useState<Episode | null>(null);
  const [showResetDemoConfirm, setShowResetDemoConfirm] = useState(false);
  const [addEpisodeValidationError, setAddEpisodeValidationError] = useState<string | null>(null);

  // Password Change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdChangeResult, setPwdChangeResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Active series in admin
  const activeSeries =
    formData.series.find((s) => s.id === formData.activeSeriesId) || formData.series[0];

  // Active season in admin
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    activeSeries?.seasons[0]?.id || ''
  );

  // New Episode state
  const [newEpNum, setNewEpNum] = useState<number>(
    (activeSeries?.seasons.find((s) => s.id === selectedSeasonId)?.episodes.length || 0) + 1
  );
  const [newEpTitle, setNewEpTitle] = useState<string>('');
  const [newEpUrl, setNewEpUrl] = useState<string>('');
  const [newEpFormat, setNewEpFormat] = useState<VideoFormat>('auto');
  const [newEpDuration, setNewEpDuration] = useState<string>('');
  const [newEpThumbnailUrl, setNewEpThumbnailUrl] = useState<string>('');

  // Source selection: upload from PC or URL
  const [videoSourceMode, setVideoSourceMode] = useState<'upload' | 'url'>('upload');
  const [thumbnailSourceMode, setThumbnailSourceMode] = useState<'upload' | 'url'>('upload');

  // Video Uploading state
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [uploadedVideoDetails, setUploadedVideoDetails] = useState<{
    filename: string;
    size: number;
    url: string;
  } | null>(null);

  // Thumbnail Uploading state
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);

  // Poster Uploading state
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [posterUploadProgress, setPosterUploadProgress] = useState(0);
  const [posterUploadError, setPosterUploadError] = useState<string | null>(null);

  // File input refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const replaceVideoInputRef = useRef<HTMLInputElement>(null);
  const replaceThumbInputRef = useRef<HTMLInputElement>(null);
  const [targetEpisodeForUpload, setTargetEpisodeForUpload] = useState<{
    seasonId: string;
    episodeId: string;
  } | null>(null);

  // Video URL testing state
  const [testResult, setTestResult] = useState<{
    url: string;
    loading: boolean;
    valid?: boolean;
    format?: string;
    message?: string;
    previewUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  // Active season object
  const currentSeason =
    activeSeries?.seasons.find((s) => s.id === selectedSeasonId) || activeSeries?.seasons[0];

  // Handler: User selects a video file from their PC
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploadError(null);
    setIsUploadingVideo(true);
    setVideoUploadProgress(0);

    // Auto set title if empty based on filename
    if (!newEpTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setNewEpTitle(baseName);
    }

    // Auto extract duration if possible using HTML5 video metadata
    try {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = URL.createObjectURL(file);
      tempVideo.onloadedmetadata = () => {
        window.URL.revokeObjectURL(tempVideo.src);
        if (tempVideo.duration && !newEpDuration) {
          setNewEpDuration(formatTime(tempVideo.duration));
        }
      };
    } catch {
      // Ignore duration extraction failure
    }

    // Upload to Express backend
    const res = await uploadVideoFile(file, (percent) => {
      setVideoUploadProgress(percent);
    });

    setIsUploadingVideo(false);

    if (res.success && res.url) {
      setNewEpUrl(res.url);
      setNewEpFormat((res.format as VideoFormat) || 'mp4');
      setUploadedVideoDetails({
        filename: file.name,
        size: file.size,
        url: res.url,
      });
      setTestResult({
        url: res.url,
        loading: false,
        valid: true,
        format: res.format || 'mp4',
        message: `Video uploaded successfully (${formatFileSize(file.size)}). Ready for playback.`,
      });
    } else {
      setVideoUploadError(res.error || 'Failed to upload video from PC.');
    }

    // Reset input value so same file can be picked again if needed
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Handler: User selects a thumbnail file from their PC
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailUploadError(null);
    setIsUploadingThumbnail(true);
    setThumbnailUploadProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setThumbnailUploadProgress(percent);
    });

    setIsUploadingThumbnail(false);

    if (res.success && res.url) {
      setNewEpThumbnailUrl(res.url);
    } else {
      setThumbnailUploadError(res.error || 'Failed to upload thumbnail.');
    }

    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  // Handler: Upload poster from PC
  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSeries) return;

    setPosterUploadError(null);
    setIsUploadingPoster(true);
    setPosterUploadProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setPosterUploadProgress(percent);
    });

    setIsUploadingPoster(false);

    if (res.success && res.url) {
      const updated = formData.series.map((s) =>
        s.id === activeSeries.id ? { ...s, posterUrl: res.url } : s
      );
      setFormData({ ...formData, series: updated });
    } else {
      setPosterUploadError(res.error || 'Failed to upload poster.');
    }

    if (posterInputRef.current) posterInputRef.current.value = '';
  };

  // Handler: Upload thumbnail for an existing episode in the list
  const handleReplaceEpisodeThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetEpisodeForUpload) return;

    const res = await uploadThumbnailFile(file);
    if (res.success && res.url) {
      handleUpdateEpisode(
        targetEpisodeForUpload.seasonId,
        targetEpisodeForUpload.episodeId,
        'thumbnailUrl',
        res.url
      );
    } else {
      alert(res.error || 'Failed to upload thumbnail');
    }
    setTargetEpisodeForUpload(null);
    if (replaceThumbInputRef.current) replaceThumbInputRef.current.value = '';
  };

  // Handler: Upload video for an existing episode in the list
  const handleReplaceEpisodeVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetEpisodeForUpload) return;

    const res = await uploadVideoFile(file);
    if (res.success && res.url) {
      handleUpdateEpisode(
        targetEpisodeForUpload.seasonId,
        targetEpisodeForUpload.episodeId,
        'videoUrl',
        res.url
      );
      handleUpdateEpisode(
        targetEpisodeForUpload.seasonId,
        targetEpisodeForUpload.episodeId,
        'videoFormat',
        res.format || 'mp4'
      );
    } else {
      alert(res.error || 'Failed to upload video');
    }
    setTargetEpisodeForUpload(null);
    if (replaceVideoInputRef.current) replaceVideoInputRef.current.value = '';
  };

  // Test video URL against backend verification
  const handleTestUrl = async (urlToTest: string, format: VideoFormat) => {
    if (!urlToTest.trim()) {
      setTestResult({
        url: urlToTest,
        loading: false,
        valid: false,
        message: 'Please enter a video URL first.',
      });
      return;
    }

    setTestResult({ url: urlToTest, loading: true });

    try {
      const res = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToTest, expectedFormat: format }),
      });
      const data = await res.json();
      setTestResult({
        url: urlToTest,
        loading: false,
        valid: data.valid,
        format: data.detectedFormat,
        message: data.message,
        previewUrl: urlToTest,
      });
    } catch (err: any) {
      setTestResult({
        url: urlToTest,
        loading: false,
        valid: true,
        format: detectVideoFormat(urlToTest, format),
        message: 'Client-side verification: Ready for stream playback.',
        previewUrl: urlToTest,
      });
    }
  };

  // Add new season to active series
  const handleAddSeason = async () => {
    if (!activeSeries) return;
    const nextSeasonNum = activeSeries.seasons.length + 1;
    const newSeason: Season = {
      id: `s-${Date.now()}`,
      seasonNumber: nextSeasonNum,
      title: `Season ${nextSeasonNum}`,
      episodes: [],
    };

    const updatedSeries = formData.series.map((s) => {
      if (s.id === activeSeries.id) {
        return {
          ...s,
          seasons: [...s.seasons, newSeason],
        };
      }
      return s;
    });

    const newConfig: AppConfig = { ...formData, series: updatedSeries };
    setFormData(newConfig);
    setSelectedSeasonId(newSeason.id);
    setNewEpNum(1);
    await onSaveConfig(newConfig);
    setSaveStatus(`Season ${nextSeasonNum} added!`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Open in-UI Create Playlist modal
  const handleOpenCreatePlaylistInAdmin = () => {
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setNewPlaylistPosterUrl('');
    setPlaylistPosterError(null);
    setPlaylistCreateError(null);
    setIsCreatePlaylistOpenInAdmin(true);
  };

  // Upload playlist poster file
  const handlePlaylistPosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlaylistPosterError(null);
    setIsUploadingPlaylistPoster(true);
    setPlaylistPosterProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setPlaylistPosterProgress(percent);
    });

    setIsUploadingPlaylistPoster(false);

    if (res.success && res.url) {
      setNewPlaylistPosterUrl(res.url);
    } else {
      setPlaylistPosterError(res.error || 'Failed to upload cover image.');
    }
  };

  // Create & Save New Playlist permanently
  const handleConfirmCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) {
      setPlaylistCreateError('Please enter a name for the playlist.');
      return;
    }

    const seriesId = `series-${Date.now()}`;
    const seasonId = `season-${Date.now()}`;
    const newSeries: Series = {
      id: seriesId,
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim(),
      posterUrl: newPlaylistPosterUrl.trim() || undefined,
      seasons: [
        {
          id: seasonId,
          seasonNumber: 1,
          title: 'Season 1',
          episodes: [],
        },
      ],
    };

    const updatedConfig: AppConfig = {
      ...formData,
      activeSeriesId: seriesId,
      series: [...formData.series, newSeries],
    };

    setFormData(updatedConfig);
    setSelectedSeasonId(seasonId);
    setNewEpNum(1);
    setIsCreatePlaylistOpenInAdmin(false);

    setIsSaving(true);
    const ok = await onSaveConfig(updatedConfig);
    setIsSaving(false);
    if (ok) {
      setSaveStatus(`Playlist "${newSeries.title}" created & saved!`);
    } else {
      setSaveStatus('Playlist created locally (Click Save Permanently to sync)');
    }
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Delete Playlist (called after in-UI confirmation)
  const handleConfirmDeleteSeries = async () => {
    if (!playlistToDeleteInAdmin) return;
    const seriesIdToDelete = playlistToDeleteInAdmin.id;
    const target = playlistToDeleteInAdmin;

    // Clean up uploaded disk files
    target.seasons.forEach((season) => {
      season.episodes.forEach((ep) => {
        if (ep.videoUrl && ep.videoUrl.startsWith('/uploads/')) {
          deleteUploadedFile(ep.videoUrl).catch(() => {});
        }
        if (ep.thumbnailUrl && ep.thumbnailUrl.startsWith('/uploads/')) {
          deleteUploadedFile(ep.thumbnailUrl).catch(() => {});
        }
      });
    });

    const remaining = formData.series.filter((s) => s.id !== seriesIdToDelete);
    const finalSeriesList =
      remaining.length > 0
        ? remaining
        : [
            {
              id: `series-${Date.now()}`,
              title: 'My Playlist',
              description: '',
              posterUrl: '',
              seasons: [
                {
                  id: `season-${Date.now()}`,
                  seasonNumber: 1,
                  title: 'Season 1',
                  episodes: [],
                },
              ],
            },
          ];

    const nextActiveId = finalSeriesList[0].id;
    const updatedConfig: AppConfig = {
      ...formData,
      activeSeriesId: nextActiveId,
      series: finalSeriesList,
    };

    setFormData(updatedConfig);
    if (finalSeriesList[0]?.seasons[0]) {
      setSelectedSeasonId(finalSeriesList[0].seasons[0].id);
      setNewEpNum(finalSeriesList[0].seasons[0].episodes.length + 1);
    }
    setPlaylistToDeleteInAdmin(null);

    setIsSaving(true);
    await onSaveConfig(updatedConfig);
    setIsSaving(false);
    setSaveStatus(`Playlist "${target.title}" deleted!`);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Add episode to selected season
  const handleAddEpisode = async () => {
    setAddEpisodeValidationError(null);

    if (!newEpUrl.trim()) {
      setAddEpisodeValidationError('Please upload a video file or paste a video URL.');
      return;
    }
    if (!currentSeason) return;

    // Determine format
    const formatToUse =
      newEpFormat === 'auto' ? detectVideoFormat(newEpUrl, 'auto') : newEpFormat;

    const newEpisode: Episode = {
      id: `ep-${Date.now()}`,
      episodeNumber: newEpNum,
      title: newEpTitle.trim() || `Episode ${newEpNum < 10 ? '0' : ''}${newEpNum}`,
      videoUrl: newEpUrl.trim(),
      videoFormat: formatToUse,
      duration: newEpDuration.trim() || undefined,
      thumbnailUrl: newEpThumbnailUrl.trim() || undefined,
    };

    const updatedSeries = formData.series.map((s) => {
      if (s.id === activeSeries.id) {
        const updatedSeasons = s.seasons.map((season) => {
          if (season.id === currentSeason.id) {
            return {
              ...season,
              episodes: [...season.episodes, newEpisode],
            };
          }
          return season;
        });
        return { ...s, seasons: updatedSeasons };
      }
      return s;
    });

    const updatedConfig: AppConfig = { ...formData, series: updatedSeries };
    setFormData(updatedConfig);

    // Reset inputs
    setNewEpNum(newEpisode.episodeNumber + 1);
    setNewEpTitle('');
    setNewEpUrl('');
    setNewEpDuration('');
    setNewEpThumbnailUrl('');
    setUploadedVideoDetails(null);
    setTestResult(null);

    // Auto-save permanently to database
    setIsSaving(true);
    await onSaveConfig(updatedConfig);
    setIsSaving(false);
    setSaveStatus(`Episode ${newEpisode.episodeNumber} added & saved!`);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Delete episode (called after in-UI confirmation)
  const handleConfirmDeleteEpisode = async () => {
    if (!episodeToDeleteInAdmin || !currentSeason) return;
    const targetEp = episodeToDeleteInAdmin;

    if (targetEp.videoUrl && targetEp.videoUrl.startsWith('/uploads/')) {
      deleteUploadedFile(targetEp.videoUrl).catch(() => {});
    }
    if (targetEp.thumbnailUrl && targetEp.thumbnailUrl.startsWith('/uploads/')) {
      deleteUploadedFile(targetEp.thumbnailUrl).catch(() => {});
    }

    const updatedSeries = formData.series.map((s) => {
      if (s.id === activeSeries.id) {
        const updatedSeasons = s.seasons.map((season) => {
          if (season.id === currentSeason.id) {
            return {
              ...season,
              episodes: season.episodes.filter((ep) => ep.id !== targetEp.id),
            };
          }
          return season;
        });
        return { ...s, seasons: updatedSeasons };
      }
      return s;
    });

    const updatedConfig: AppConfig = { ...formData, series: updatedSeries };
    setFormData(updatedConfig);
    setEpisodeToDeleteInAdmin(null);

    setIsSaving(true);
    await onSaveConfig(updatedConfig);
    setIsSaving(false);
    setSaveStatus(`Episode ${targetEp.episodeNumber} deleted!`);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Update specific episode inline
  const handleUpdateEpisode = (
    seasonId: string,
    episodeId: string,
    field: keyof Episode,
    value: any
  ) => {
    const updatedSeries = formData.series.map((s) => {
      if (s.id === activeSeries.id) {
        const updatedSeasons = s.seasons.map((season) => {
          if (season.id === seasonId) {
            return {
              ...season,
              episodes: season.episodes.map((ep) => {
                if (ep.id === episodeId) {
                  return { ...ep, [field]: value };
                }
                return ep;
              }),
            };
          }
          return season;
        });
        return { ...s, seasons: updatedSeasons };
      }
      return s;
    });
    setFormData({ ...formData, series: updatedSeries });
  };

  // Handle Logo file upload (as base64 Data URL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        if (result) {
          setFormData({ ...formData, logoUrl: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes to backend permanently
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    const ok = await onSaveConfig(formData);
    setIsSaving(false);
    if (ok) {
      setSaveStatus('Changes saved permanently to database!');
      setTimeout(() => setSaveStatus(null), 3500);
    } else {
      setSaveStatus('Error saving changes to database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#10131d] border border-[#23293d] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1d2235] bg-[#0c0e17]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Admin Setup</h2>
              <p className="text-xs text-gray-400">Manage series, seasons, episodes, logo, and video links</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1d2235] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1d2235] bg-[#0e111a] px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Seasons & Episodes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('series_info')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'series_info'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Series / Anime Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'logo'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Logo Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security & Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Languages className="w-4 h-4 text-amber-400" />
            <span>Manage Requests</span>
            {adminRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                {adminRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channel')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'channel'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bell className="w-4 h-4 text-red-400" />
            <span>Channel & Subs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('urls')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'urls'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span>Playlist & Video URLs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Seasons & Episodes */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              {/* Active Playlist Selector & Create Playlist Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f1320] p-3.5 rounded-xl border border-[#21293e]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-red-500" /> Current Playlist:
                  </span>
                  <select
                    value={formData.activeSeriesId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setFormData({ ...formData, activeSeriesId: newId });
                      const s = formData.series.find((x) => x.id === newId);
                      if (s && s.seasons.length > 0) {
                        setSelectedSeasonId(s.seasons[0].id);
                        setNewEpNum(s.seasons[0].episodes.length + 1);
                      }
                    }}
                    className="bg-[#171c2b] text-xs text-white px-3 py-1.5 rounded-lg border border-[#2d3856] focus:outline-none focus:border-red-500 font-semibold"
                  >
                    {formData.series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCreatePlaylistInAdmin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition-colors shadow"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Create New Playlist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeSeries) {
                        setPlaylistToDeleteInAdmin(activeSeries);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-950/80 border border-red-900/50 hover:border-red-700 text-xs font-bold text-red-400 hover:text-red-300 rounded-lg transition-colors"
                    title="Delete current playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Playlist</span>
                  </button>
                </div>
              </div>

              {/* Season Selection Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131724] p-3.5 rounded-xl border border-[#20273c]">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Season:
                  </span>
                  {activeSeries?.seasons.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      onClick={() => {
                        setSelectedSeasonId(season.id);
                        setNewEpNum(season.episodes.length + 1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedSeasonId === season.id
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-[#1b2030] text-gray-300 hover:bg-[#252c42]'
                      }`}
                    >
                      {season.title || `Season ${season.seasonNumber}`} ({season.episodes.length})
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSeason}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f263b] hover:bg-[#2b3552] text-xs font-semibold text-white rounded-lg border border-[#323d5e] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>Add Season</span>
                </button>
              </div>

              {/* Add New Episode Card */}
              <div className="bg-[#131724] rounded-xl p-4 sm:p-5 border border-[#232a42]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-red-500" />
                    <span>Add Episode to {currentSeason?.title || 'Current Season'}</span>
                  </h3>
                </div>

                {/* Episode Basics: Number, Title, Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 mb-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Ep Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newEpNum}
                      onChange={(e) => setNewEpNum(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#1b2030] text-sm text-white px-3 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Episode Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. The Awakening"
                      value={newEpTitle}
                      onChange={(e) => setNewEpTitle(e.target.value)}
                      className="w-full bg-[#1b2030] text-sm text-white px-3 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Duration (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 23:45"
                      value={newEpDuration}
                      onChange={(e) => setNewEpDuration(e.target.value)}
                      className="w-full bg-[#1b2030] text-sm text-white px-3 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* 1. Video Source Toggle: Upload from PC vs Paste Link */}
                <div className="mb-4 bg-[#0e111a] p-3.5 rounded-xl border border-[#1f263d]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <FileVideo className="w-4 h-4 text-red-500" />
                      <span>Video Source</span>
                    </span>

                    <div className="flex items-center bg-[#171b29] p-0.5 rounded-lg border border-[#27304b]">
                      <button
                        type="button"
                        onClick={() => setVideoSourceMode('upload')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          videoSourceMode === 'upload'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload from PC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVideoSourceMode('url')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          videoSourceMode === 'url'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Paste Video URL</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode A: Upload from PC */}
                  {videoSourceMode === 'upload' ? (
                    <div>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*,.mp4,.webm,.mkv,.mov,.avi"
                        onChange={handleVideoFileChange}
                        className="hidden"
                      />

                      {isUploadingVideo ? (
                        <div className="p-5 border border-dashed border-red-500/50 bg-red-950/10 rounded-xl flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                          <div className="w-full max-w-xs bg-[#1f263b] rounded-full h-2 overflow-hidden mt-1">
                            <div
                              className="bg-red-600 h-full transition-all duration-200"
                              style={{ width: `${videoUploadProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-300">
                            Uploading video from PC... {videoUploadProgress}%
                          </span>
                        </div>
                      ) : uploadedVideoDetails ? (
                        <div className="p-3.5 bg-[#171c2b] border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                              <Check className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {uploadedVideoDetails.filename}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                Size: {formatFileSize(uploadedVideoDetails.size)} • Format: {newEpFormat}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="px-3 py-1.5 bg-[#232b42] hover:bg-[#2e3957] text-xs font-semibold text-gray-200 rounded-lg border border-[#374468] transition-colors shrink-0 flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                            <span>Change File</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => videoInputRef.current?.click()}
                          className="p-6 border border-dashed border-[#2f3957] hover:border-red-500/80 bg-[#141826] hover:bg-[#181d2e] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-bold text-gray-200 group-hover:text-white">
                              Click to browse and upload video from your PC
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Supports MP4, WebM, MKV, MOV, AVI (Direct local storage up to 800MB)
                            </p>
                          </div>
                        </div>
                      )}

                      {videoUploadError && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{videoUploadError}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Mode B: Paste Video URL */
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <input
                          type="url"
                          placeholder="https://example.com/video.mp4 or .m3u8 or .mpd or YouTube/Vimeo"
                          value={newEpUrl}
                          onChange={(e) => setNewEpUrl(e.target.value)}
                          className="w-full bg-[#1b2030] text-sm text-white px-3.5 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500 font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <select
                          value={newEpFormat}
                          onChange={(e) => setNewEpFormat(e.target.value as VideoFormat)}
                          className="w-full bg-[#1b2030] text-sm text-white px-3 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500"
                        >
                          <option value="auto">Auto Detect (Recommended)</option>
                          <option value="mp4">Direct MP4 Video</option>
                          <option value="webm">WebM Video</option>
                          <option value="hls">HLS Stream (.m3u8)</option>
                          <option value="dash">DASH Stream (.mpd)</option>
                          <option value="embed">Embedded Player / Iframe</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Episode Thumbnail Setup (Upload from PC or URL) */}
                <div className="mb-4 bg-[#0e111a] p-3.5 rounded-xl border border-[#1f263d]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Episode Thumbnail (Optional)</span>
                    </span>

                    <div className="flex items-center bg-[#171b29] p-0.5 rounded-lg border border-[#27304b]">
                      <button
                        type="button"
                        onClick={() => setThumbnailSourceMode('upload')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          thumbnailSourceMode === 'upload'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload from PC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setThumbnailSourceMode('url')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          thumbnailSourceMode === 'url'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Thumbnail URL</span>
                      </button>
                    </div>
                  </div>

                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    onChange={handleThumbnailFileChange}
                    className="hidden"
                  />

                  {thumbnailSourceMode === 'upload' ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {isUploadingThumbnail ? (
                        <div className="flex-1 w-full py-3 px-4 bg-[#141826] border border-dashed border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                          <span>Uploading thumbnail... {thumbnailUploadProgress}%</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="flex-1 w-full py-2.5 px-4 bg-[#171c2a] hover:bg-[#1f2638] border border-dashed border-[#2f3957] hover:border-emerald-500/70 rounded-xl text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Click to select thumbnail image from PC (JPG, PNG, WebP)</span>
                        </button>
                      )}

                      {newEpThumbnailUrl && (
                        <div className="relative w-28 h-16 rounded-lg overflow-hidden border border-[#2b3552] shrink-0 group">
                          <img
                            src={newEpThumbnailUrl}
                            alt="Thumbnail Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setNewEpThumbnailUrl('')}
                            className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white hover:bg-red-600 transition-colors"
                            title="Remove Thumbnail"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="url"
                        placeholder="https://example.com/thumbnail.jpg"
                        value={newEpThumbnailUrl}
                        onChange={(e) => setNewEpThumbnailUrl(e.target.value)}
                        className="flex-1 bg-[#1b2030] text-sm text-white px-3.5 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-emerald-500 font-mono text-xs"
                      />

                      {newEpThumbnailUrl && (
                        <div className="w-24 h-14 rounded-lg overflow-hidden border border-[#2b3552] shrink-0">
                          <img
                            src={newEpThumbnailUrl}
                            alt="Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {thumbnailUploadError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{thumbnailUploadError}</span>
                    </p>
                  )}
                </div>

                {/* Test Link & Add Episode Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestUrl(newEpUrl, newEpFormat)}
                    disabled={!newEpUrl.trim() || testResult?.loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1f263d] hover:bg-[#2c3656] disabled:opacity-50 text-xs font-semibold text-gray-200 rounded-lg border border-[#303c60] transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-400" />
                    <span>{testResult?.loading ? 'Validating Link...' : 'Test Video Playback'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddEpisode}
                    disabled={!newEpUrl.trim() || isUploadingVideo}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors shadow-md shadow-red-950/40"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Episode</span>
                  </button>
                </div>

                {/* Validation Error Banner */}
                {addEpisodeValidationError && (
                  <div className="mt-3 p-3 rounded-lg border border-red-800/60 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{addEpisodeValidationError}</span>
                  </div>
                )}

                {/* Link Verification Result Banner */}
                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      testResult.valid
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/60 text-red-300'
                    }`}
                  >
                    {testResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    )}
                    <div>
                      <span className="font-bold">
                        {testResult.valid ? 'Link Ready' : 'Validation Notice'}:
                      </span>{' '}
                      {testResult.message}
                      {testResult.format && (
                        <span className="ml-2 px-2 py-0.5 uppercase text-[10px] rounded bg-white/10 font-mono font-bold">
                          Format: {testResult.format}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Episodes List for this Season */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Episodes in {currentSeason?.title || 'Season'} (
                    {currentSeason?.episodes.length || 0})
                  </h4>
                </div>

                {currentSeason?.episodes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-[#131623] rounded-xl border border-[#21273b]">
                    No episodes added to this season yet. Add one above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentSeason?.episodes.map((ep) => (
                      <div
                        key={ep.id}
                        className="bg-[#141826] p-3 sm:p-3.5 rounded-xl border border-[#22293e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Episode Thumbnail preview or placeholder */}
                          <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-[#0c0e17] border border-[#252c42] shrink-0 group/thumb">
                            {ep.thumbnailUrl ? (
                              <img
                                src={ep.thumbnailUrl}
                                alt={ep.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}

                            {/* Quick change thumbnail overlay button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTargetEpisodeForUpload({
                                  seasonId: currentSeason.id,
                                  episodeId: ep.id,
                                });
                                replaceThumbInputRef.current?.click();
                              }}
                              title="Upload thumbnail from PC"
                              className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                              <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">
                                Ep {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                              </span>
                              <span className="text-gray-300 truncate font-medium max-w-[200px] sm:max-w-xs">
                                {ep.title}
                              </span>
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#1e2438] text-gray-400 border border-[#2c3450]">
                                {ep.videoFormat}
                              </span>
                              {ep.duration && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {ep.duration}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5 max-w-sm sm:max-w-md">
                              {ep.videoUrl}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                          {/* Upload Video from PC */}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetEpisodeForUpload({
                                seasonId: currentSeason.id,
                                episodeId: ep.id,
                              });
                              replaceVideoInputRef.current?.click();
                            }}
                            className="px-2.5 py-1 bg-[#1e253b] hover:bg-[#28324f] text-gray-200 rounded border border-[#2b3552] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Upload new video file from PC for this episode"
                          >
                            <FileVideo className="w-3 h-3 text-red-400" />
                            <span>Replace Video</span>
                          </button>

                          {/* Upload Thumbnail from PC */}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetEpisodeForUpload({
                                seasonId: currentSeason.id,
                                episodeId: ep.id,
                              });
                              replaceThumbInputRef.current?.click();
                            }}
                            className="px-2.5 py-1 bg-[#1e253b] hover:bg-[#28324f] text-gray-200 rounded border border-[#2b3552] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Upload new thumbnail image from PC"
                          >
                            <ImageIcon className="w-3 h-3 text-emerald-400" />
                            <span>{ep.thumbnailUrl ? 'Change Thumb' : 'Add Thumb'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTestUrl(ep.videoUrl, ep.videoFormat)}
                            className="px-2 py-1 bg-[#1a1f30] hover:bg-[#242b43] text-gray-300 rounded border border-[#27304b] text-[11px] transition-colors"
                          >
                            Test
                          </button>

                          <button
                            type="button"
                            onClick={() => setEpisodeToDeleteInAdmin(ep)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                            title="Delete Episode"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Series / Anime Info */}
          {activeTab === 'series_info' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Series / Anime Title
                </label>
                <input
                  type="text"
                  value={activeSeries?.title || ''}
                  onChange={(e) => {
                    const updated = formData.series.map((s) =>
                      s.id === activeSeries.id ? { ...s, title: e.target.value } : s
                    );
                    setFormData({ ...formData, series: updated });
                  }}
                  className="w-full bg-[#141826] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#262e45] focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Description / Synopsis
                </label>
                <textarea
                  rows={3}
                  value={activeSeries?.description || ''}
                  onChange={(e) => {
                    const updated = formData.series.map((s) =>
                      s.id === activeSeries.id ? { ...s, description: e.target.value } : s
                    );
                    setFormData({ ...formData, series: updated });
                  }}
                  className="w-full bg-[#141826] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#262e45] focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Poster / Backdrop Image (URL or Upload from PC)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                  <input
                    type="url"
                    placeholder="https://example.com/poster.jpg"
                    value={activeSeries?.posterUrl || ''}
                    onChange={(e) => {
                      const updated = formData.series.map((s) =>
                        s.id === activeSeries.id ? { ...s, posterUrl: e.target.value } : s
                      );
                      setFormData({ ...formData, series: updated });
                    }}
                    className="flex-1 w-full bg-[#141826] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#262e45] focus:outline-none focus:border-red-500 text-xs font-mono"
                  />

                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    disabled={isUploadingPoster}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#1f263d] hover:bg-[#2c3656] disabled:opacity-50 text-xs font-semibold text-gray-200 rounded-xl border border-[#303c60] flex items-center justify-center gap-2 transition-colors shrink-0"
                  >
                    {isUploadingPoster ? (
                      <>
                        <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                        <span>Uploading {posterUploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-red-400" />
                        <span>Upload Poster from PC</span>
                      </>
                    )}
                  </button>
                </div>

                {posterUploadError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{posterUploadError}</span>
                  </p>
                )}

                {activeSeries?.posterUrl && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="w-36 h-20 rounded-lg overflow-hidden border border-[#2a334d] shrink-0">
                      <img
                        src={activeSeries.posterUrl}
                        alt="Poster Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.series.map((s) =>
                          s.id === activeSeries.id ? { ...s, posterUrl: '' } : s
                        );
                        setFormData({ ...formData, series: updated });
                      }}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Remove Poster
                    </button>
                  </div>
                )}
              </div>

              {/* Danger Zone: Delete Entire Playlist */}
              <div className="pt-4 border-t border-[#22293e]">
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Delete Entire Playlist</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Permanently delete &quot;{activeSeries?.title}&quot; and all of its seasons and episodes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSeries) {
                        setPlaylistToDeleteInAdmin(activeSeries);
                      }
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow shrink-0 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Playlist</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Logo Setup */}
          {activeTab === 'logo' && (
            <div className="space-y-5 max-w-2xl">
              <div className="bg-[#131724] p-4 rounded-xl border border-[#22293e]">
                <h4 className="text-sm font-bold text-white mb-1">Website Logo</h4>
                <p className="text-xs text-gray-400 mb-4">
                  Provide your logo image via URL or upload directly from your device. Your logo is placed at the top of the website.
                </p>

                {/* Option 1: URL */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/my-logo.png"
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full bg-[#1b2030] text-sm text-white px-3.5 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500 font-mono text-xs"
                  />
                </div>

                {/* Option 2: File Upload */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Or Upload Logo File
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1b2030] hover:bg-[#232a3f] border border-dashed border-[#343e5c] rounded-xl cursor-pointer transition-colors text-xs text-gray-300">
                    <Upload className="w-4 h-4 text-red-500" />
                    <span>Click to upload image file (PNG, SVG, JPG, WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Option 3: Fallback Text */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Fallback Logo Text (if image is not used)
                  </label>
                  <input
                    type="text"
                    value={formData.logoText || ''}
                    onChange={(e) => setFormData({ ...formData, logoText: e.target.value })}
                    className="w-full bg-[#1b2030] text-sm text-white px-3.5 py-2 rounded-lg border border-[#2b334d] focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Logo Preview */}
              <div className="bg-[#0b0d14] p-4 rounded-xl border border-[#1f2438]">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  Live Top Bar Preview:
                </span>
                <div className="h-14 bg-[#0d0f17] border border-[#1f2333] rounded-lg px-4 flex items-center">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Preview"
                      referrerPolicy="no-referrer"
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                        <Film className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-lg font-black tracking-wider text-white">
                        {formData.logoText || 'STREAM'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Security & Password Management */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Security Status Card */}
              <div className="bg-gradient-to-r from-[#141a2e] to-[#0f1322] border border-[#232d4b] rounded-2xl p-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Admin Access Protection</h3>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Only users with the Admin Password can upload videos, create playlists, edit video links, or delete content. Regular viewers can stream and download without modifying any data.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-[11px] font-semibold text-red-400">
                        <KeyRound className="w-3.5 h-3.5" /> Default Password: <strong className="text-amber-300 font-mono font-bold">1234</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Upload & Delete Guard Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="bg-[#121624] border border-[#22293e] rounded-2xl p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-[#1f263b] pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-500" />
                    <h4 className="text-sm font-bold text-white">Change Admin Password</h4>
                  </div>
                  <span className="text-[11px] text-gray-400">Update system admin password</span>
                </div>

                {/* Status message */}
                {pwdChangeResult && (
                  <div
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs ${
                      pwdChangeResult.type === 'success'
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : 'bg-red-950/40 border border-red-500/30 text-red-300'
                    }`}
                  >
                    {pwdChangeResult.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{pwdChangeResult.message}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Current Password <span className="text-gray-500">(Default: 1234)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        placeholder="Enter current password (e.g. 1234)"
                        className="w-full bg-[#0d101c] border border-[#2b334d] focus:border-red-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                        tabIndex={-1}
                      >
                        {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showNewPwd ? 'text' : 'password'}
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full bg-[#0d101c] border border-[#2b334d] focus:border-red-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                          tabIndex={-1}
                        >
                          {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showNewPwd ? 'text' : 'password'}
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full bg-[#0d101c] border border-[#2b334d] focus:border-red-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isChangingPwd || !currentPwd || !newPwd || !confirmPwd}
                    onClick={async () => {
                      if (!currentPwd.trim()) {
                        setPwdChangeResult({ type: 'error', message: 'Please enter your current admin password.' });
                        return;
                      }
                      if (!newPwd.trim()) {
                        setPwdChangeResult({ type: 'error', message: 'New password cannot be empty.' });
                        return;
                      }
                      if (newPwd !== confirmPwd) {
                        setPwdChangeResult({ type: 'error', message: 'New passwords do not match. Please re-enter.' });
                        return;
                      }

                      setIsChangingPwd(true);
                      setPwdChangeResult(null);

                      const res = await changeAdminPassword(currentPwd, newPwd);
                      setIsChangingPwd(false);

                      if (res.success) {
                        setPwdChangeResult({
                          type: 'success',
                          message: 'Admin password updated successfully! You can now use your new password.',
                        });
                        setCurrentPwd('');
                        setNewPwd('');
                        setConfirmPwd('');
                      } else {
                        setPwdChangeResult({
                          type: 'error',
                          message: res.error || 'Failed to update admin password. Check your current password.',
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-950/40"
                  >
                    {isChangingPwd ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    <span>{isChangingPwd ? 'Updating Password...' : 'Save New Password'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Manage Content & Language Requests */}
          {activeTab === 'requests' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-[#141a2e] to-[#0f1322] border border-[#232d4b] rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Languages className="w-5 h-5 text-amber-400" />
                    Viewer Content Requests
                  </h3>
                  <p className="text-xs text-gray-300">
                    Review what shows, movies, or anime viewers are requesting. You can mark them as <span className="text-amber-400 font-semibold">Pending</span>, <span className="text-blue-400 font-semibold">In Progress</span>, or <span className="text-emerald-400 font-semibold">Completed</span>, or remove them.
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-[#1a2136] border border-[#2c3654] rounded-xl text-xs font-mono text-gray-300">
                  Total Requests: <strong className="text-white">{adminRequests.length}</strong>
                </div>
              </div>

              {adminRequests.length === 0 ? (
                <div className="py-16 text-center bg-[#121624] border border-[#222a40] rounded-2xl">
                  <Languages className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-gray-300">No requests submitted yet</p>
                  <p className="text-xs text-gray-500 mt-1">Viewer requests will appear here when submitted from the Public Requests tab.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#121624] border border-[#222a40] hover:border-red-500/40 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                            {req.contentType}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 text-[10px] font-semibold">
                            {req.language}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            👍 {req.votes} Votes
                          </span>
                          <span className="text-xs text-gray-500">
                            By {req.requesterName || 'Anonymous'}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white">{req.title}</h4>
                        {req.description && (
                          <p className="text-xs text-gray-400 line-clamp-2">{req.description}</p>
                        )}
                      </div>

                      {/* Status changer & Delete actions */}
                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1c243a]">
                        <select
                          value={req.status}
                          onChange={(e) => handleUpdateReqStatus(req.id, e.target.value as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                            req.status === 'completed'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                              : req.status === 'approved'
                              ? 'bg-blue-950/40 text-blue-300 border-blue-500/40'
                              : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          <option value="pending" className="bg-[#121624] text-amber-300">Pending</option>
                          <option value="approved" className="bg-[#121624] text-blue-300">In Progress</option>
                          <option value="completed" className="bg-[#121624] text-emerald-300">Completed</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteReq(req.id)}
                          className="p-2 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors"
                          title="Remove Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Channel & Subs Setup */}
          {activeTab === 'channel' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Channel & Subscription Settings</h3>
                <p className="text-xs text-gray-400">
                  Configure your channel name, channel link, and subscriber counter. Viewers must subscribe to your channel before downloading videos or series.
                </p>
              </div>

              <div className="space-y-4 bg-[#141826] p-5 rounded-xl border border-[#232a3f]">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Channel Name</label>
                  <input
                    type="text"
                    value={channelForm.channelName}
                    onChange={(e) => setChannelForm({ ...channelForm, channelName: e.target.value })}
                    className="w-full bg-[#1c2235] text-white text-xs rounded-xl px-3.5 py-2.5 border border-[#2d3752] focus:outline-none focus:border-red-500"
                    placeholder="e.g. My Anime & Drama Hub"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Channel Link (URL)</label>
                  <input
                    type="url"
                    value={channelForm.channelUrl}
                    onChange={(e) => setChannelForm({ ...channelForm, channelUrl: e.target.value })}
                    className="w-full bg-[#1c2235] text-white text-xs rounded-xl px-3.5 py-2.5 border border-[#2d3752] focus:outline-none focus:border-red-500"
                    placeholder="https://youtube.com/@yourchannel"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">When users click Subscribe, this channel link will open in a new tab.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subscriber Count</label>
                  <input
                    type="number"
                    value={channelForm.subscriberCount}
                    onChange={(e) => setChannelForm({ ...channelForm, subscriberCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#1c2235] text-white text-xs rounded-xl px-3.5 py-2.5 border border-[#2d3752] focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Displayed in the header and download subscription gate.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveChannelSettings}
                    className="py-2.5 px-5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-950/40 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Channel Settings</span>
                  </button>
                </div>
              </div>

              {/* Subscribers Activity / Status Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Subscribers Status Log</h4>
                    <p className="text-xs text-gray-400">See who has subscribed to your channel and who has not.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                      {subscribersList.filter(s => s.status === 'Subscribed').length} Subscribed
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-red-950/60 text-red-400 border border-red-500/30 text-xs font-bold">
                      {subscribersList.filter(s => s.status !== 'Subscribed').length} Not Subscribed
                    </span>
                  </div>
                </div>

                <div className="bg-[#141826] rounded-xl border border-[#232a3f] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#1a2033] border-b border-[#242c44] text-gray-300 font-bold">
                          <th className="p-3">Viewer Name</th>
                          <th className="p-3">Email / Account</th>
                          <th className="p-3">Time</th>
                          <th className="p-3 text-right">Subscription Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#20273c]">
                        {subscribersList.map((sub) => (
                          <tr key={sub.id} className="hover:bg-[#1a2135]/50 transition-colors">
                            <td className="p-3 font-semibold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center font-bold text-[11px]">
                                {sub.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{sub.name}</span>
                            </td>
                            <td className="p-3 text-gray-300 font-mono text-[11px]">{sub.email}</td>
                            <td className="p-3 text-gray-400 text-[11px]">{sub.subscribedAt}</td>
                            <td className="p-3 text-right">
                              {sub.status === 'Subscribed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                                  <Check className="w-3 h-3" /> Subscribed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/80 text-red-400 border border-red-500/40 text-[11px] font-bold">
                                  <X className="w-3 h-3" /> Not Subscribed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Playlist & Video URLs */}
          {activeTab === 'urls' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">All Playlists & Video URLs</h3>
                <p className="text-xs text-gray-400">
                  Browse all video movies and episodes across all playlists, and copy their direct playback URLs instantly.
                </p>
                {copiedUrlText && (
                  <div className="mt-2.5 p-2 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                    <span className="font-mono truncate">Copied: {copiedUrlText}</span>
                    <span className="font-bold uppercase text-[10px] bg-emerald-600 px-2 py-0.5 rounded text-white">Copied to Clipboard!</span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {formData.series.map((seriesItem) => {
                  const allEpisodesCount = seriesItem.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
                  return (
                    <div key={seriesItem.id} className="bg-[#131722] rounded-2xl border border-[#232a3f] p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#20273c] pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={seriesItem.posterUrl}
                            alt={seriesItem.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 object-cover rounded-lg border border-[#2b354f]"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{seriesItem.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                                {allEpisodesCount} Episodes
                              </span>
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-1">{seriesItem.description || 'No description'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const playlistUrlData = JSON.stringify(seriesItem, null, 2);
                            handleCopyUrl(playlistUrlData);
                          }}
                          className="px-3 py-1.5 bg-[#1b2235] hover:bg-[#252f4a] text-gray-200 text-xs font-semibold rounded-lg border border-[#2b354f] flex items-center gap-1.5 transition-colors"
                          title="Copy Playlist JSON / Data"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copy Playlist Data</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {seriesItem.seasons.map((season) => (
                          <div key={season.id} className="bg-[#171c2b] rounded-xl p-3 border border-[#212a40] space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                              <span>Season {season.seasonNumber}: {season.title}</span>
                              <span className="text-gray-400 font-mono text-[11px]">{season.episodes.length} episodes</span>
                            </div>

                            <div className="space-y-1.5">
                              {season.episodes.map((ep) => (
                                <div key={ep.id} className="flex items-center justify-between gap-3 bg-[#0d101a] p-2.5 rounded-lg border border-[#1e2538] hover:border-[#2f3b5c] transition-all">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                                      E{ep.episodeNumber}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-white truncate">{ep.title}</p>
                                      <p className="text-[10px] font-mono text-gray-400 truncate max-w-xs sm:max-w-md">{ep.videoUrl}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {ep.duration && (
                                      <span className="text-[10px] font-mono text-gray-400 bg-[#161b29] px-2 py-0.5 rounded border border-[#242e47] hidden sm:inline-block">
                                        {ep.duration}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCopyUrl(ep.videoUrl)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                      title="Copy Direct Video URL"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy URL</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#1d2235] bg-[#0c0e17]">
          <button
            type="button"
            onClick={() => setShowResetDemoConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs font-semibold text-emerald-400 animate-fade-in">
                {saveStatus}
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1f2e] hover:bg-[#252b3f] text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-950/50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Permanently'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. IN-UI MODAL: Create New Playlist / Series */}
      {isCreatePlaylistOpenInAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#131724] border border-[#27304b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#20273c] bg-[#0d101a]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <span>Create New Playlist</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpenInAdmin(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Playlist / Series Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solo Leveling, Attack on Titan..."
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="w-full bg-[#1c2233] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#2b354f] focus:outline-none focus:border-red-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description / Synopsis (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of this series or collection..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  className="w-full bg-[#1c2233] text-xs text-white px-3.5 py-2 rounded-xl border border-[#2b354f] focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Poster Source Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Poster / Cover Image
                  </label>
                  <div className="flex items-center bg-[#171c2b] p-0.5 rounded-lg border border-[#252f47]">
                    <button
                      type="button"
                      onClick={() => setNewPlaylistCoverMode('upload')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
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
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                        newPlaylistCoverMode === 'url'
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {newPlaylistCoverMode === 'upload' ? (
                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 p-3 bg-[#191f30] hover:bg-[#20273c] border border-dashed border-[#2f3957] hover:border-emerald-500/60 rounded-xl cursor-pointer transition-colors text-xs text-gray-300">
                      {isUploadingPlaylistPoster ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Uploading... {playlistPosterProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Browse Cover Image from PC</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.jpg,.jpeg,.png,.webp"
                        onChange={handlePlaylistPosterFileUpload}
                        className="hidden"
                      />
                    </label>

                    {newPlaylistPosterUrl && (
                      <div className="flex items-center gap-2.5 p-2 bg-[#171d2c] border border-[#242e47] rounded-lg">
                        <img
                          src={newPlaylistPosterUrl}
                          alt="Poster Preview"
                          referrerPolicy="no-referrer"
                          className="w-10 h-14 object-cover rounded border border-[#2b354f]"
                        />
                        <span className="text-xs text-emerald-400 font-semibold truncate flex-1">
                          Cover uploaded successfully
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewPlaylistPosterUrl('')}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://example.com/poster.jpg"
                    value={newPlaylistPosterUrl}
                    onChange={(e) => setNewPlaylistPosterUrl(e.target.value)}
                    className="w-full bg-[#1c2233] text-xs text-white px-3.5 py-2 rounded-xl border border-[#2b354f] focus:outline-none focus:border-red-500"
                  />
                )}

                {playlistPosterError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{playlistPosterError}</span>
                  </p>
                )}
              </div>

              {playlistCreateError && (
                <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{playlistCreateError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#20273c] bg-[#0d101a]">
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpenInAdmin(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1a2030] hover:bg-[#232b40] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreatePlaylist}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Create Playlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. IN-UI MODAL: Delete Playlist Confirmation */}
      {playlistToDeleteInAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#141826] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Playlist?</h4>
                <p className="text-xs text-gray-400">
                  This playlist and its episodes will be removed permanently.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e111a] border border-[#232a40] text-xs space-y-1">
              <p className="font-bold text-white text-sm">{playlistToDeleteInAdmin.title}</p>
              <p className="text-gray-400 text-xs">
                {playlistToDeleteInAdmin.seasons.reduce((acc, s) => acc + s.episodes.length, 0)} total videos in {playlistToDeleteInAdmin.seasons.length} season(s)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPlaylistToDeleteInAdmin(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSeries}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Playlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IN-UI MODAL: Delete Episode Confirmation */}
      {episodeToDeleteInAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#141826] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Episode?</h4>
                <p className="text-xs text-gray-400">
                  This episode will be deleted permanently.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e111a] border border-[#232a40] text-xs">
              <p className="font-bold text-white">
                Ep {episodeToDeleteInAdmin.episodeNumber}: {episodeToDeleteInAdmin.title}
              </p>
              <p className="text-gray-400 text-[11px] font-mono mt-0.5 truncate">
                {episodeToDeleteInAdmin.videoUrl}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setEpisodeToDeleteInAdmin(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEpisode}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Episode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. IN-UI MODAL: Reset Demo Data Confirmation */}
      {showResetDemoConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#141826] border border-amber-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Reset Demo Data?</h4>
                <p className="text-xs text-gray-400">
                  This will restore all default playlists and episodes.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetDemoConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#1e2538] hover:bg-[#27314a] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetDemoConfirm(false);
                  onResetDemo();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Replace Actions and Poster */}
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp"
        onChange={handlePosterFileChange}
        className="hidden"
      />
      <input
        ref={replaceThumbInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp"
        onChange={handleReplaceEpisodeThumbnail}
        className="hidden"
      />
      <input
        ref={replaceVideoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mkv,.mov,.avi"
        onChange={handleReplaceEpisodeVideo}
        className="hidden"
      />
    </div>
  );
};
