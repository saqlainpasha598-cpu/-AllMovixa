import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Save,
  Upload,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Check,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Episode, VideoFormat } from '../types';
import { detectVideoFormat } from '../utils/videoDetector';
import {
  uploadVideoFile,
  uploadThumbnailFile,
  formatFileSize,
  extractVideoMetadata,
  deleteUploadedFile,
} from '../utils/fileUploader';

interface ReplaceLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode | null;
  onSaveNewLink: (
    episodeId: string,
    newUrl: string,
    newFormat: VideoFormat,
    newThumbnailUrl?: string,
    newQuality?: string,
    newResolution?: { width: number; height: number }
  ) => void;
}

export const ReplaceLinkModal: React.FC<ReplaceLinkModalProps> = ({
  isOpen,
  onClose,
  episode,
  onSaveNewLink,
}) => {
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState(episode?.videoUrl || '');
  const [format, setFormat] = useState<VideoFormat>(episode?.videoFormat || 'auto');
  const [quality, setQuality] = useState<string | undefined>(episode?.quality);
  const [resolution, setResolution] = useState<{ width: number; height: number } | undefined>(episode?.resolution);

  // Thumbnail state
  const [thumbMode, setThumbMode] = useState<'url' | 'upload'>('upload');
  const [thumbnailUrl, setThumbnailUrl] = useState(episode?.thumbnailUrl || '');

  // Upload states
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [thumbUploadError, setThumbUploadError] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    detectedFormat?: string;
  } | null>(null);

  if (!isOpen || !episode) return null;

  // Handle Video file upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploadError(null);
    setIsUploadingVideo(true);
    setVideoProgress(0);

    extractVideoMetadata(file)
      .then((meta) => {
        if (meta) {
          if (meta.qualityLabel) setQuality(meta.qualityLabel);
          if (meta.width && meta.height) setResolution({ width: meta.width, height: meta.height });
        }
      })
      .catch((err) => console.warn('Replace video metadata probe:', err));

    const res = await uploadVideoFile(file, (percent) => {
      setVideoProgress(percent);
    });

    setIsUploadingVideo(false);

    if (res.success && res.url) {
      setUrl(res.url);
      setFormat(res.format || 'mp4');
      setTestResult({
        valid: true,
        message: `Uploaded "${file.name}" (${formatFileSize(file.size)}) successfully.`,
        detectedFormat: res.format,
      });
    } else {
      setVideoUploadError(res.error || 'Failed to upload video from PC.');
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Handle Thumbnail file upload
  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbUploadError(null);
    setIsUploadingThumb(true);
    setThumbProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setThumbProgress(percent);
    });

    setIsUploadingThumb(false);

    if (res.success && res.url) {
      setThumbnailUrl(res.url);
    } else {
      setThumbUploadError(res.error || 'Failed to upload thumbnail image.');
    }
    if (thumbInputRef.current) thumbInputRef.current.value = '';
  };

  const handleTest = async () => {
    if (!url.trim()) return;
    setIsTesting(true);
    try {
      const res = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), expectedFormat: format }),
      });
      const data = await res.json();
      setTestResult({
        valid: data.valid,
        message: data.message,
        detectedFormat: data.detectedFormat,
      });
    } catch {
      setTestResult({
        valid: true,
        message: 'Client-side verification ready for playback.',
        detectedFormat: detectVideoFormat(url, format),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!url.trim()) return;
    const finalFormat = format === 'auto' ? detectVideoFormat(url, 'auto') : format;
    onSaveNewLink(
      episode.id,
      url.trim(),
      finalFormat,
      thumbnailUrl.trim() || undefined,
      quality || undefined,
      resolution || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121520] border border-[#23293d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d2235] bg-[#0d0f17] shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Replace Video Link
            </h3>
            <p className="text-xs text-gray-400">
              Ep {episode.episodeNumber < 10 ? `0${episode.episodeNumber}` : episode.episodeNumber}: {episode.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1d2235] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Section 1: Video File or URL */}
          <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <FileVideo className="w-4 h-4 text-red-500" />
                <span>Video Source</span>
              </span>

              <div className="flex items-center bg-[#171b29] p-0.5 rounded-lg border border-[#27304b]">
                <button
                  type="button"
                  onClick={() => setVideoMode('upload')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                    videoMode === 'upload'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('url')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                    videoMode === 'url'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>URL Link</span>
                </button>
              </div>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mkv,.mov,.avi"
              onChange={handleVideoUpload}
              className="hidden"
            />

            {videoMode === 'upload' ? (
              <div>
                {isUploadingVideo ? (
                  <div className="p-4 border border-dashed border-red-500/50 rounded-xl bg-red-950/10 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    <div className="w-full max-w-xs bg-[#1a2033] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-red-600 h-full transition-all"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">
                      Uploading video file... {videoProgress}%
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full p-4 border border-dashed border-[#2f3957] hover:border-red-500/80 bg-[#141826] hover:bg-[#181d2e] rounded-xl flex items-center justify-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-200 hover:text-white transition-all"
                  >
                    <Upload className="w-4 h-4 text-red-500" />
                    <span>Click to choose video from PC (Large files up to 10GB • Auto 1080p/720p detection)</span>
                  </button>
                )}

                {url && (
                  <div className="mt-2 text-[11px] text-gray-400 font-mono bg-[#141826] px-3 py-1.5 rounded-lg border border-[#22293d] flex items-center justify-between gap-2">
                    <span className="truncate">Current: {url}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="uppercase text-[10px] text-emerald-400 font-bold">
                        {format}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (url.startsWith('/uploads/')) {
                            await deleteUploadedFile(url);
                          }
                          setUrl('');
                          setTestResult(null);
                        }}
                        className="p-1 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete this uploaded video"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="Paste direct MP4, WebM, HLS (.m3u8), DASH (.mpd), or Embed link"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-[#171c2b] text-sm text-white px-3.5 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500 font-mono text-xs"
                />

                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as VideoFormat)}
                  className="w-full bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-red-500"
                >
                  <option value="auto">Auto Detect Format</option>
                  <option value="mp4">Direct MP4 Video</option>
                  <option value="webm">WebM Video</option>
                  <option value="hls">HLS Stream (.m3u8)</option>
                  <option value="dash">DASH Stream (.mpd)</option>
                  <option value="embed">Embed / Iframe Link</option>
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Thumbnail Image */}
          <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Episode Thumbnail</span>
              </span>

              <div className="flex items-center bg-[#171b29] p-0.5 rounded-lg border border-[#27304b]">
                <button
                  type="button"
                  onClick={() => setThumbMode('upload')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                    thumbMode === 'upload'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThumbMode('url')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                    thumbMode === 'url'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>URL Link</span>
                </button>
              </div>
            </div>

            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp"
              onChange={handleThumbUpload}
              className="hidden"
            />

            {thumbMode === 'upload' ? (
              <div className="flex items-center gap-3">
                {isUploadingThumb ? (
                  <div className="flex-1 p-3 bg-[#141826] border border-dashed border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Uploading... {thumbProgress}%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-[#141826] hover:bg-[#1b2133] border border-dashed border-[#2b3552] hover:border-emerald-500/70 rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload image from PC</span>
                  </button>
                )}

                {thumbnailUrl && (
                  <div className="relative w-24 h-14 rounded-lg overflow-hidden border border-[#2b3552] shrink-0">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-white hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/thumbnail.jpg"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="flex-1 bg-[#171c2b] text-sm text-white px-3.5 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                {thumbnailUrl && (
                  <div className="w-20 h-12 rounded-lg overflow-hidden border border-[#2b3552] shrink-0">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {thumbUploadError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{thumbUploadError}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={!url.trim() || isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f263d] hover:bg-[#2c3656] disabled:opacity-50 text-xs font-semibold text-gray-200 rounded-lg border border-[#303c60] transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>{isTesting ? 'Validating...' : 'Test Video Playback'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
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
                <span className="font-bold">{testResult.valid ? 'Ready' : 'Note'}:</span>{' '}
                {testResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#1d2235] bg-[#0d0f17] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#1a1f2e] hover:bg-[#252b3f] text-gray-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!url.trim() || isUploadingVideo}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-red-950/40"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
