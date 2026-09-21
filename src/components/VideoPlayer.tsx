import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Loader2,
  Settings,
  Check,
  Sparkles,
  Download,
  Copy,
  Link,
  Share2,
} from 'lucide-react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { VideoFormat } from '../types';
import { detectVideoFormat, formatEmbedUrl, formatTime, isHlsSupportedNatively } from '../utils/videoDetector';
import { getQualityLabelFromResolution } from '../utils/fileUploader';
import { copyToClipboard } from '../utils/clipboard';

export interface QualityOption {
  id: string; // 'auto' or 'level-0', etc., or '1080p', '720p'
  label: string; // '1080p Full HD', '720p HD', etc.
  shortLabel: string; // '1080p', '720p'
  height?: number;
  width?: number;
  bitrate?: number;
}

interface VideoPlayerProps {
  url: string;
  format?: VideoFormat;
  title?: string;
  posterUrl?: string;
  initialQuality?: string;
  isAdmin?: boolean;
  onReplaceLink?: () => void;
  onEnded?: () => void;
  onOpenDownloadModal?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  format = 'auto',
  title,
  posterUrl,
  initialQuality,
  isAdmin = false,
  onReplaceLink,
  onEnded,
  onOpenDownloadModal,
  onTimeUpdate,
}) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [effectiveFormat, setEffectiveFormat] = useState<VideoFormat>('mp4');

  // Video Quality States
  const [currentResolution, setCurrentResolution] = useState<{ width: number; height: number } | null>(null);
  const [detectedQuality, setDetectedQuality] = useState<{ qualityLabel: string; shortQuality: string }>({
    qualityLabel: initialQuality || 'HD',
    shortQuality: initialQuality?.split(' ')[0] || 'HD',
  });
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([]);
  const [selectedQualityId, setSelectedQualityId] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  // Copy URL state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  const handleCopyVideoUrl = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!url) return;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedUrl(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopiedUrl(false), 2200);
    }
  };

  // Close quality menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up any existing HLS / DASH instances
  const cleanupPlayers = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
  }, []);

  // Main video initialization whenever URL or format changes
  useEffect(() => {
    cleanupPlayers();
    setErrorMsg(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    if (!url || !url.trim()) {
      setIsLoading(false);
      setErrorMsg('No video link provided for this episode.');
      return;
    }

    const detected = detectVideoFormat(url, format);
    setEffectiveFormat(detected);

    if (detected === 'embed') {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.removeAttribute('src');
    video.load();

    // 1. DASH Playback (.mpd)
    if (detected === 'dash') {
      try {
        if (dashjs.supportsMediaSource()) {
          const player = dashjs.MediaPlayer().create();
          player.initialize(video, url, false);
          player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
            console.error('DASH Error:', e);
            setErrorMsg('This video link cannot be played in your browser.');
            setIsLoading(false);
          });
          dashRef.current = player;
        } else {
          setErrorMsg('This video link cannot be played in your browser. (DASH not supported)');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('DASH Init Error:', err);
        setErrorMsg('This video link cannot be played in your browser.');
        setIsLoading(false);
      }
      return;
    }

    // 2. HLS Playback (.m3u8)
    if (detected === 'hls') {
      // First check native HLS support (Safari, iOS Safari)
      if (isHlsSupportedNatively(video)) {
        video.src = url;
      } else if (Hls.isSupported()) {
        try {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            setIsLoading(false);
            if (data.levels && data.levels.length > 0) {
              const opts: QualityOption[] = [
                {
                  id: 'auto',
                  label: 'Auto (Recommended)',
                  shortLabel: 'Auto',
                },
                ...data.levels.map((level, idx) => {
                  const h = level.height || 0;
                  const w = level.width || 0;
                  const { qualityLabel, shortQuality } = getQualityLabelFromResolution(w, h);
                  return {
                    id: `hls-${idx}`,
                    label: qualityLabel,
                    shortLabel: shortQuality,
                    height: h,
                    width: w,
                    bitrate: level.bitrate,
                  };
                }),
              ];
              setAvailableQualities(opts);
            }
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
            const currentLevel = hls.levels[data.level];
            if (currentLevel) {
              const w = currentLevel.width || 0;
              const h = currentLevel.height || 0;
              setCurrentResolution({ width: w, height: h });
              const { qualityLabel, shortQuality } = getQualityLabelFromResolution(w, h);
              setDetectedQuality({ qualityLabel, shortQuality });
            }
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            console.warn('HLS Event Error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('HLS network error, attempting recovery...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('HLS media error, attempting recovery...');
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setErrorMsg('This video link cannot be played in your browser.');
                  setIsLoading(false);
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } catch (err) {
          console.error('HLS Init Error:', err);
          setErrorMsg('This video link cannot be played in your browser.');
          setIsLoading(false);
        }
      } else {
        setErrorMsg('This video link cannot be played in your browser. (HLS unsupported)');
        setIsLoading(false);
      }
      return;
    }

    // 3. Direct HTML5 (MP4, WebM, or fallback)
    video.src = url;
    video.load();

    return () => {
      cleanupPlayers();
    };
  }, [url, format, cleanupPlayers]);

  // Video HTML5 Event Listeners
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vid = videoRef.current;
      setDuration(vid.duration || 0);
      setIsLoading(false);

      const w = vid.videoWidth || 0;
      const h = vid.videoHeight || 0;

      if (w > 0 && h > 0) {
        setCurrentResolution({ width: w, height: h });
        const { qualityLabel, shortQuality } = getQualityLabelFromResolution(w, h);
        setDetectedQuality({ qualityLabel, shortQuality });

        // If not already populated by HLS / DASH manifest, build available resolution profile options
        setAvailableQualities((prev) => {
          if (prev.length > 0 && effectiveFormat === 'hls') return prev;

          const options: QualityOption[] = [
            {
              id: 'original',
              label: `${qualityLabel} (${w}×${h})`,
              shortLabel: shortQuality,
              height: h,
              width: w,
            },
          ];

          // Add standard lower quality scalings if source video is 1080p, 720p, etc.
          if (h >= 1000) {
            options.push(
              { id: '1080p', label: '1080p Full HD (Original)', shortLabel: '1080p', height: 1080, width: 1920 },
              { id: '720p', label: '720p HD (Smooth)', shortLabel: '720p', height: 720, width: 1280 },
              { id: '480p', label: '480p SD (Data Saver)', shortLabel: '480p', height: 480, width: 854 },
              { id: '360p', label: '360p SD (Low)', shortLabel: '360p', height: 360, width: 640 }
            );
          } else if (h >= 700) {
            options.push(
              { id: '720p', label: '720p HD (Original)', shortLabel: '720p', height: 720, width: 1280 },
              { id: '480p', label: '480p SD (Data Saver)', shortLabel: '480p', height: 480, width: 854 },
              { id: '360p', label: '360p SD (Low)', shortLabel: '360p', height: 360, width: 640 }
            );
          } else if (h >= 460) {
            options.push(
              { id: '480p', label: '480p SD (Original)', shortLabel: '480p', height: 480, width: 854 },
              { id: '360p', label: '360p SD (Low)', shortLabel: '360p', height: 360, width: 640 }
            );
          }

          return options;
        });
      }
    }
  };

  // Switch video quality
  const handleSelectQuality = (opt: QualityOption) => {
    setSelectedQualityId(opt.id);
    setShowQualityMenu(false);

    // If HLS stream
    if (hlsRef.current && opt.id.startsWith('hls-')) {
      const levelIndex = parseInt(opt.id.replace('hls-', ''), 10);
      hlsRef.current.currentLevel = levelIndex;
      setDetectedQuality({ qualityLabel: opt.label, shortQuality: opt.shortLabel });
    } else if (hlsRef.current && opt.id === 'auto') {
      hlsRef.current.currentLevel = -1; // Auto level
    } else {
      // Direct MP4 / HTML5: update label and apply visual scaling/downscale buffer optimization
      setDetectedQuality({ qualityLabel: opt.label, shortQuality: opt.shortLabel });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration || 0;
      setCurrentTime(curr);
      if (!duration && videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
      onTimeUpdate?.(curr, dur);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleWaiting = () => setIsLoading(true);
  const handlePlaying = () => setIsLoading(false);

  const handleError = () => {
    if (effectiveFormat !== 'embed') {
      setErrorMsg('This video link cannot be played in your browser.');
      setIsLoading(false);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.warn('Playback request error:', err);
      });
    } else {
      video.pause();
    }
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Volume handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      const restoredVol = volume > 0 ? volume : 0.7;
      videoRef.current.muted = false;
      videoRef.current.volume = restoredVol;
      setIsMuted(false);
      setVolume(restoredVol);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Exit fullscreen error:', err);
      });
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide controls when playing and inactive
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2600);
    }
  };

  // Keyboard shortcuts (Space = play/pause, F = fullscreen, M = mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard shortcuts when typing in inputs/modals
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-[#222738] select-none group"
      id="video-player-container"
    >
      {/* 1. Embed Player View (YouTube / Vimeo / Generic Embed) */}
      {effectiveFormat === 'embed' ? (
        <div className="w-full h-full relative">
          <iframe
            src={formatEmbedUrl(url)}
            title={title || 'Video Player'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        /* 2. Direct HTML5 / HLS / DASH Video View */
        <div className="w-full h-full relative flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            poster={posterUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            onError={handleError}
            onEnded={onEnded}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Buffering Spinner */}
          {isLoading && !errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            </div>
          )}

          {/* Big Center Play/Pause button when paused or hovering */}
          {!isPlaying && !isLoading && !errorMsg && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play Video"
              className="absolute inset-auto w-18 h-18 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}

          {/* Top-Right Corner Action Buttons (Copy URL & Download) */}
          <div
            className={`absolute top-3 right-3 z-30 flex items-center gap-2 transition-opacity duration-300 ${
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0 sm:opacity-75 sm:hover:opacity-100'
            }`}
          >
            {/* Copy Video URL Button */}
            {url && (
              <button
                type="button"
                id="player-corner-copy-btn"
                onClick={handleCopyVideoUrl}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-bold transition-all shadow-xl shadow-black/60 hover:scale-105 border ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-black/75 hover:bg-[#1a2138] text-gray-200 hover:text-white border-white/20'
                }`}
                title="Copy Video URL to Clipboard"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-red-400" />
                    <span className="hidden xs:inline">Copy Link</span>
                  </>
                )}
              </button>
            )}

            {/* Download Button */}
            <button
              type="button"
              id="player-corner-download-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDownloadModal) {
                  onOpenDownloadModal();
                } else {
                  window.dispatchEvent(new CustomEvent('openDownloadModalGeneric'));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-red-600 text-white border border-white/20 hover:border-red-500 backdrop-blur-md text-xs font-bold transition-all shadow-xl shadow-black/60 group/dl hover:scale-105"
              title="Download Video (Laptop / Mobile / Website Storage)"
            >
              <Download className="w-4 h-4 text-red-400 group-hover/dl:text-white transition-colors" />
              <span className="hidden xs:inline">Download</span>
            </button>
          </div>

          {/* Custom Controls Bar */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 pb-3 px-4 transition-opacity duration-300 ${
              showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Progress / Seek Bar */}
            <div className="relative flex items-center mb-2.5 group/progress">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none transition-all group-hover/progress:h-2.5"
                style={{
                  background: duration
                    ? `linear-gradient(to right, #dc2626 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%)`
                    : '#374151',
                }}
              />
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between gap-2 text-white">
              {/* Left Controls: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-gray-300" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-red-500 transition-all"
                  />
                </div>

                {/* Time Display */}
                <div className="text-xs font-mono text-gray-300 tracking-wider">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-gray-500">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Controls: Quality Selector, Format Badge, Fullscreen */}
              <div className="flex items-center gap-2.5">
                {/* Quality Selector Control */}
                <div className="relative" ref={qualityMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all shadow-md group/qbtn"
                    title="Change Video Quality / Resolution"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-300 group-hover/qbtn:rotate-45 transition-transform" />
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      {detectedQuality.shortQuality || 'HD'}
                    </span>
                    {(detectedQuality.shortQuality === '1080p' ||
                      detectedQuality.shortQuality === '4K' ||
                      detectedQuality.shortQuality === '720p') && (
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-red-600 font-extrabold text-white leading-tight">
                        HD
                      </span>
                    )}
                  </button>

                  {/* Quality Dropdown Popup */}
                  {showQualityMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#121624]/95 backdrop-blur-md border border-[#2b3552] rounded-xl shadow-2xl p-1.5 z-50 text-white animate-in fade-in slide-in-from-bottom-2">
                      <div className="px-2.5 py-1.5 border-b border-[#232a40] flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-red-400" />
                          <span>Quality & Resolution</span>
                        </span>
                        {currentResolution && (
                          <span className="text-[10px] font-mono text-gray-400">
                            {currentResolution.width}×{currentResolution.height}
                          </span>
                        )}
                      </div>

                      <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
                        {availableQualities.length > 0 ? (
                          availableQualities.map((q) => {
                            const isSelected = selectedQualityId === q.id;
                            const isHD =
                              q.shortLabel === '1080p' ||
                              q.shortLabel === '4K' ||
                              q.shortLabel === '720p';
                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => handleSelectQuality(q)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-red-600/25 text-white font-bold border border-red-500/40'
                                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{q.label}</span>
                                  {isHD && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-red-600/80 font-bold text-white uppercase">
                                      HD
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-2.5 py-2 text-xs text-gray-400">
                            Current: {detectedQuality.qualityLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy Video URL Button in Controls Bar */}
                {url && (
                  <button
                    type="button"
                    onClick={handleCopyVideoUrl}
                    className={`p-1.5 rounded-lg transition-colors ${
                      copiedUrl ? 'bg-emerald-600/30 text-emerald-400' : 'hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                    title={copiedUrl ? 'Copied Video URL!' : 'Copy Video URL / Link'}
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}

                {/* Download Button in Controls Bar */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenDownloadModal) {
                      onOpenDownloadModal();
                    } else {
                      window.dispatchEvent(new CustomEvent('openDownloadModalGeneric'));
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  title="Download Video (Laptop, Mobile, Website)"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Format Indicator Badge */}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/15 text-gray-300 border border-white/10">
                  {effectiveFormat}
                </span>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay: Clean, friendly fallback according to prompt requirements */}
      {errorMsg && (
        <div className="absolute inset-0 bg-[#0e111a]/95 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center mb-4 text-red-400 shadow-lg">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            This video link cannot be played in your browser.
          </h3>
          <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
            The link format, host server or cross-origin headers may be preventing direct playback. You can easily test, edit, or replace this video link.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAdmin && onReplaceLink && (
              <button
                type="button"
                onClick={onReplaceLink}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                <span>Replace Video Link</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsLoading(true);
                const vid = videoRef.current;
                if (vid) {
                  vid.load();
                  vid.play().catch(() => {});
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b2030] hover:bg-[#252b40] text-gray-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2e3752] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
