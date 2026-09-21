import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Laptop,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Copy,
  Check,
  HardDrive,
  Sparkles,
  ExternalLink,
  Play,
  Bell,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Series, Season, Episode, User } from '../types';
import { downloadAndSaveOfflineVideo, getOfflineVideo, formatBytes } from '../utils/offlineStorage';
import { copyToClipboard } from '../utils/clipboard';
import { getChannelConfig, isUserSubscribed, setUserSubscribed, incrementSubscriberCount } from '../utils/channelConfig';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  series?: Series | null;
  season?: Season | null;
  episode?: Episode | null;
  currentUser: User | null;
  onRequireAuth: () => void;
  onDownloadCompleted?: () => void;
  onNavigateToDownloadsPage?: () => void;
}

type DownloadTarget = 'laptop' | 'mobile' | 'website';

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  series,
  season,
  episode,
  currentUser,
  onRequireAuth,
  onDownloadCompleted,
  onNavigateToDownloadsPage,
}) => {
  const [activeTarget, setActiveTarget] = useState<DownloadTarget>('laptop');
  const [selectedQuality, setSelectedQuality] = useState<string>(episode?.quality || '1080p Full HD');
  const [isDownloadingToWebsite, setIsDownloadingToWebsite] = useState(false);
  const [websiteDownloadProgress, setWebsiteDownloadProgress] = useState<{
    percent: number;
    loadedBytes: number;
    totalBytes: number;
    speedBps: number;
  } | null>(null);
  const [websiteDownloadSuccess, setWebsiteDownloadSuccess] = useState(false);
  const [websiteDownloadError, setWebsiteDownloadError] = useState<string | null>(null);
  const [isAlreadySavedOffline, setIsAlreadySavedOffline] = useState(false);

  // Subscription Gate state
  const [userSubscribed, setUserSubscribedState] = useState(() => isUserSubscribed());
  const [showSubGate, setShowSubGate] = useState(false);
  const channelConfig = getChannelConfig();

  const verifySubscriptionBeforeAction = (action: () => void) => {
    if (!isUserSubscribed()) {
      setShowSubGate(true);
      return;
    }
    action();
  };

  const handleSubscribeAndUnlock = () => {
    incrementSubscriberCount();
    setUserSubscribedState(true);
    setShowSubGate(false);
    if (channelConfig.channelUrl) {
      window.open(channelConfig.channelUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerifySubscribed = () => {
    setUserSubscribed(true);
    setUserSubscribedState(true);
    setShowSubGate(false);
  };

  // Mobile QR Code & Copy state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDirectUrl, setCopiedDirectUrl] = useState(false);

  // Check if already saved offline
  useEffect(() => {
    if (!isOpen || !episode) return;
    let isMounted = true;
    getOfflineVideo(episode.id).then((item) => {
      if (isMounted) {
        setIsAlreadySavedOffline(Boolean(item));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, episode]);

  // Construct standard clean filename for download
  const cleanSeries = (series?.title || 'Series').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanEpTitle = (episode?.title || 'Episode').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanSeries}_S${String(season?.seasonNumber || 1).padStart(2, '0')}E${String(
    episode?.episodeNumber || 1
  ).padStart(2, '0')}_${cleanEpTitle}.mp4`;

  // Direct download URL through server proxy
  const serverDownloadUrl = `/api/download?url=${encodeURIComponent(episode?.videoUrl || '')}&filename=${encodeURIComponent(
    filename
  )}`;

  // Generate full mobile download link
  const fullMobileUrl = typeof window !== 'undefined' ? `${window.location.origin}${serverDownloadUrl}` : serverDownloadUrl;

  // Generate QR Code for mobile
  useEffect(() => {
    if (activeTarget === 'mobile' && fullMobileUrl) {
      QRCode.toDataURL(fullMobileUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f121d',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [activeTarget, fullMobileUrl]);

  if (!isOpen || !episode) return null;

  // Handle direct Laptop / PC download
  const handleLaptopDownload = () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    verifySubscriptionBeforeAction(() => {
      const link = document.createElement('a');
      link.href = serverDownloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Handle direct Mobile download
  const handleMobileDownload = () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    verifySubscriptionBeforeAction(() => {
      const link = document.createElement('a');
      link.href = serverDownloadUrl;
      link.setAttribute('download', filename);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Handle in-website offline download
  const handleWebsiteOfflineDownload = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    verifySubscriptionBeforeAction(async () => {
      setIsDownloadingToWebsite(true);
      setWebsiteDownloadError(null);
      setWebsiteDownloadProgress({ percent: 0, loadedBytes: 0, totalBytes: 0, speedBps: 0 });

      try {
        // Use direct video URL or proxy url
        const downloadTargetUrl = episode.videoUrl.startsWith('/uploads/')
          ? episode.videoUrl
          : `/api/download?url=${encodeURIComponent(episode.videoUrl)}&filename=${encodeURIComponent(filename)}`;

        await downloadAndSaveOfflineVideo(
          {
            episodeId: episode.id,
            seriesId: series?.id || 'series-default',
            seasonId: season?.id || 'season-default',
            seriesTitle: series?.title || 'Video Series',
            seasonNumber: season?.seasonNumber || 1,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            thumbnailUrl: episode.thumbnailUrl,
            duration: episode.duration,
            quality: selectedQuality,
            videoUrl: downloadTargetUrl,
            userEmail: currentUser?.email,
          },
          (progress) => {
            setWebsiteDownloadProgress(progress);
          }
        );

        setIsDownloadingToWebsite(false);
        setWebsiteDownloadSuccess(true);
        setIsAlreadySavedOffline(true);
        onDownloadCompleted?.();
      } catch (err: any) {
        console.error('Offline download failed:', err);
        setIsDownloadingToWebsite(false);
        setWebsiteDownloadError(err?.message || 'Failed to download and save offline video.');
      }
    });
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(fullMobileUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyDirectVideoUrl = async () => {
    if (!episode?.videoUrl) return;
    const success = await copyToClipboard(episode.videoUrl);
    if (success) {
      setCopiedDirectUrl(true);
      setTimeout(() => setCopiedDirectUrl(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#101422] border border-[#26314d] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0 text-white flex flex-col max-h-[92vh] relative">
        {/* Subscription Gate Overlay */}
        {showSubGate && (
          <div className="absolute inset-0 z-50 bg-[#101422]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center mb-4 shadow-xl">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Subscribe to Unlock Downloads!</h3>
            <p className="text-xs sm:text-sm text-gray-300 max-w-md mb-6 leading-relaxed">
              To download this video on PC, laptop, or website, please subscribe to our channel <strong className="text-amber-300">{channelConfig.channelName}</strong> first.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={handleSubscribeAndUnlock}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-950/40 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Subscribe Now ({channelConfig.subscriberCount} Subs)</span>
              </button>

              <button
                type="button"
                onClick={handleVerifySubscribed}
                className="w-full py-3 px-4 bg-[#1f263c] hover:bg-[#28314f] text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>I Have Subscribed</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSubGate(false)}
              className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Cancel
            </button>
          </div>
        )}
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171f34] to-[#111628] border-b border-[#222c45] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Download Video</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  Choose Destination
                </span>
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {series?.title} • S{season?.seasonNumber} E{episode?.episodeNumber} - {episode?.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Destination Switcher Tabs (Laptop vs Mobile vs Website) */}
        <div className="p-3 sm:p-4 bg-[#0c0f1a] border-b border-[#1f273d] shrink-0">
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#151a2a] rounded-xl border border-[#252f4a]">
            {/* 1. Laptop / PC */}
            <button
              type="button"
              onClick={() => setActiveTarget('laptop')}
              className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTarget === 'laptop'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Laptop className="w-4 h-4 shrink-0" />
              <span>Laptop / PC</span>
            </button>

            {/* 2. Mobile */}
            <button
              type="button"
              onClick={() => setActiveTarget('mobile')}
              className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTarget === 'mobile'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Mobile Phone</span>
            </button>

            {/* 3. Website Offline */}
            <button
              type="button"
              onClick={() => setActiveTarget('website')}
              className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTarget === 'website'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Website Offline</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Episode Info Banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#141928] border border-[#232d47]">
            {episode.thumbnailUrl ? (
              <img
                src={episode.thumbnailUrl}
                alt={episode.title}
                referrerPolicy="no-referrer"
                className="w-16 h-10 object-cover rounded-lg border border-[#2b3654] shrink-0"
              />
            ) : (
              <div className="w-16 h-10 bg-[#1b2135] rounded-lg border border-[#2b3654] flex items-center justify-center text-gray-500 shrink-0">
                <Play className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{episode.title}</h4>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                <span>Format: {episode.videoFormat || 'MP4'}</span>
                <span>•</span>
                <span>Quality: {episode.quality || '1080p HD'}</span>
              </div>
            </div>

            {/* Quick Copy Stream URL button */}
            {episode.videoUrl && (
              <button
                type="button"
                onClick={handleCopyDirectVideoUrl}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
                  copiedDirectUrl
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#1b233a] hover:bg-[#252f4d] text-gray-300 hover:text-white border-[#2b395b]'
                }`}
                title="Copy direct video URL"
              >
                {copiedDirectUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-red-400" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            )}

            {isAlreadySavedOffline && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Saved in Website</span>
              </span>
            )}
          </div>

          {/* User Auth Status notice */}
          {!currentUser && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Login is required to start downloading.</span>
              </div>
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded-lg text-xs transition-colors shrink-0 shadow"
              >
                Sign In Now
              </button>
            </div>
          )}

          {/* TAB 1: LAPTOP / PC DOWNLOAD */}
          {activeTarget === 'laptop' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14192a] border border-[#222c45] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <Laptop className="w-4 h-4 text-red-400" />
                  <span>Download directly to your Laptop / PC Hard Drive</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Downloads a standalone <code className="text-red-300 font-mono text-[11px]">.mp4</code> video file directly into your computer&apos;s <strong>Downloads</strong> folder with full audio and high-resolution video streams.
                </p>

                {/* Quality Selection */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Select Download Resolution / Quality:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['1080p Full HD', '720p HD', '480p SD', 'Original High Quality'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuality(q)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
                          selectedQuality === q
                            ? 'bg-red-600/25 border-red-500 text-white'
                            : 'bg-[#181e30] border-[#293450] text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0e111c] border border-[#1e2538] text-[11px] font-mono text-gray-400 flex items-center justify-between">
                  <span className="truncate">File: {filename}</span>
                  <span className="text-emerald-400 font-bold shrink-0 ml-2">Direct MP4</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaptopDownload}
                className="w-full py-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download to Laptop / PC</span>
              </button>
            </div>
          )}

          {/* TAB 2: MOBILE PHONE DOWNLOAD */}
          {activeTarget === 'mobile' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14192a] border border-[#222c45] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <Smartphone className="w-4 h-4 text-red-400" />
                  <span>Download on Smartphone (Android / iOS / Tablet)</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Scan this QR code with your mobile camera or copy the link to download the video directly to your phone gallery/storage.
                </p>

                {/* QR Code display */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-[#0d101b] rounded-xl border border-[#20273c]">
                  <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Mobile Download QR Code" className="w-36 h-36" />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-gray-400">
                        <QrCode className="w-10 h-10 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs space-y-2 text-center sm:text-left flex-1 min-w-0">
                    <div className="font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-4 h-4 text-red-400" />
                      <span>Scan to Download on Phone</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Open your phone camera app or QR scanner to download the file directly to your smartphone.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2135] hover:bg-[#232c46] border border-[#2e3958] text-xs font-semibold text-gray-200 hover:text-white transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Mobile Download Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMobileDownload}
                className="w-full py-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Start Direct Mobile Download</span>
              </button>
            </div>
          )}

          {/* TAB 3: WEBSITE OFFLINE STORAGE DOWNLOAD */}
          {activeTarget === 'website' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14192a] border border-[#222c45] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                    <Globe className="w-4 h-4 text-red-400" />
                    <span>Download to Website (Offline Storage)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-bold">
                    In-Browser Storage
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Saves the video directly into your web browser&apos;s offline memory (IndexedDB). You can watch this video anytime on the dedicated <strong>Downloads Page</strong> even when you are disconnected from the internet!
                </p>

                {/* Progress bar during download */}
                {isDownloadingToWebsite && websiteDownloadProgress && (
                  <div className="p-3.5 rounded-xl bg-[#0e111d] border border-red-900/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                        <span>Downloading to Website...</span>
                      </span>
                      <span className="font-mono text-red-400 font-bold">
                        {websiteDownloadProgress.percent}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#1b2236] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200 rounded-full"
                        style={{ width: `${websiteDownloadProgress.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span>
                        {formatBytes(websiteDownloadProgress.loadedBytes)} /{' '}
                        {formatBytes(websiteDownloadProgress.totalBytes)}
                      </span>
                      {websiteDownloadProgress.speedBps > 0 && (
                        <span>{formatBytes(websiteDownloadProgress.speedBps)}/s</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {websiteDownloadSuccess && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Video Successfully Saved to Website Offline Storage!</span>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      This video is now accessible anytime without internet connection on the Downloads page.
                    </p>
                    {onNavigateToDownloadsPage && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToDownloadsPage();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Downloads Page</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {websiteDownloadError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{websiteDownloadError}</span>
                  </div>
                )}
              </div>

              {!websiteDownloadSuccess && (
                <button
                  type="button"
                  disabled={isDownloadingToWebsite}
                  onClick={handleWebsiteOfflineDownload}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
                >
                  {isDownloadingToWebsite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading to Website ({websiteDownloadProgress?.percent || 0}%)...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4" />
                      <span>{isAlreadySavedOffline ? 'Re-Download & Save to Website' : 'Save to Website for Offline Watching'}</span>
                    </>
                  )}
                </button>
              )}

              {onNavigateToDownloadsPage && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToDownloadsPage();
                    }}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    <span>View all saved offline videos on Downloads Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
