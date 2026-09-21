import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  FolderPlus,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Loader2,
  AlertCircle,
  Tv,
  Layers,
  CheckCircle2,
  FileVideo,
} from 'lucide-react';
import { uploadThumbnailFile } from '../utils/fileUploader';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeriesTitle?: string;
  onCreateSeries: (
    title: string,
    description?: string,
    posterUrl?: string
  ) => { seriesId: string; seasonId: string } | void;
  onCreateSeason: (title: string) => string | void;
  onOpenUploadForSeries?: (seriesId: string, seasonId: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  currentSeriesTitle = 'Current Series',
  onCreateSeries,
  onCreateSeason,
  onOpenUploadForSeries,
}) => {
  // Playlist Type: 'series' = New Anime / Playlist collection; 'season' = New Season in current Series
  const [playlistType, setPlaylistType] = useState<'series' | 'season'>('series');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverSourceMode, setCoverSourceMode] = useState<'upload' | 'url'>('upload');
  const [posterUrl, setPosterUrl] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPosterUrl('');
      setUploadError(null);
      setValidationError(null);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const res = await uploadThumbnailFile(file, (percent) => {
      setUploadProgress(percent);
    });

    setIsUploading(false);

    if (res.success && res.url) {
      setPosterUrl(res.url);
    } else {
      setUploadError(res.error || 'Failed to upload image cover.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = (andUploadVideo = false) => {
    if (!title.trim()) {
      setValidationError('Please enter a name for the playlist / anime.');
      titleInputRef.current?.focus();
      return;
    }

    setValidationError(null);

    if (playlistType === 'series') {
      const result = onCreateSeries(
        title.trim(),
        description.trim() || undefined,
        posterUrl.trim() || undefined
      );

      onClose();

      if (andUploadVideo && result && result.seriesId && onOpenUploadForSeries) {
        setTimeout(() => {
          onOpenUploadForSeries(result.seriesId, result.seasonId);
        }, 150);
      }
    } else {
      const seasonId = onCreateSeason(title.trim());
      onClose();

      if (andUploadVideo && seasonId && onOpenUploadForSeries) {
        setTimeout(() => {
          onOpenUploadForSeries('', seasonId);
        }, 150);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121520] border border-[#23293d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d2235] bg-[#0d0f17] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-red-950/40">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Create New Playlist</h3>
              <p className="text-xs text-gray-400">Nayi anime playlist ya season create karein</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1f2537] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Choose Playlist Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Playlist Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlaylistType('series')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  playlistType === 'series'
                    ? 'bg-red-950/30 border-red-500 text-white ring-1 ring-red-500 shadow-md'
                    : 'bg-[#161a27] border-[#252c42] text-gray-300 hover:border-[#384364]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Tv className="w-4 h-4 text-red-400" />
                  <span>New Anime Playlist</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Full standalone playlist with its own seasons & videos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPlaylistType('season')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  playlistType === 'season'
                    ? 'bg-red-950/30 border-red-500 text-white ring-1 ring-red-500 shadow-md'
                    : 'bg-[#161a27] border-[#252c42] text-gray-300 hover:border-[#384364]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Layers className="w-4 h-4 text-red-400" />
                  <span>Season in Current</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Adds new season to &quot;{currentSeriesTitle}&quot;
                </span>
              </button>
            </div>
          </div>

          {/* 2. Playlist / Series Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              {playlistType === 'series' ? 'Playlist / Anime Name *' : 'Season Title *'}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              placeholder={
                playlistType === 'series'
                  ? 'e.g. Solo Leveling, Demon Slayer, Naruto Shippuden'
                  : 'e.g. Season 2, Entertainment District Arc, Movies'
              }
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate(false);
                }
              }}
              className={`w-full bg-[#171c2b] text-sm text-white px-3.5 py-2.5 rounded-xl border transition-colors focus:outline-none ${
                validationError ? 'border-red-500 focus:border-red-400' : 'border-[#27314b] focus:border-red-500'
              }`}
            />
            {validationError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* 3. Description (Series only) */}
          {playlistType === 'series' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Description / Storyline (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Short description or overview of this playlist..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#171c2b] text-xs text-white px-3.5 py-2 rounded-xl border border-[#27314b] focus:outline-none focus:border-red-500 resize-none"
              />
            </div>
          )}

          {/* 4. Cover / Poster Image (Series only) */}
          {playlistType === 'series' && (
            <div className="bg-[#0b0e17] p-3.5 rounded-xl border border-[#1e253b]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Playlist Cover Poster (Optional)</span>
                </span>

                <div className="flex items-center bg-[#171b29] p-0.5 rounded-lg border border-[#27304b]">
                  <button
                    type="button"
                    onClick={() => setCoverSourceMode('upload')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                      coverSourceMode === 'upload'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload PC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverSourceMode('url')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                      coverSourceMode === 'url'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>URL</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              {coverSourceMode === 'upload' ? (
                <div className="flex items-center gap-3">
                  {isUploading ? (
                    <div className="flex-1 p-3 bg-[#141826] border border-dashed border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Uploading cover... {uploadProgress}%</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-[#141826] hover:bg-[#1b2133] border border-dashed border-[#2b3552] hover:border-emerald-500/70 rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Click to select cover image from PC (JPG, PNG, WebP)</span>
                    </button>
                  )}

                  {posterUrl && (
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-[#2b3552] shrink-0">
                      <img
                        src={posterUrl}
                        alt="Cover Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPosterUrl('')}
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-white hover:bg-red-600"
                        title="Remove"
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
                    placeholder="https://example.com/poster.jpg"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    className="flex-1 bg-[#171c2b] text-xs text-white px-3 py-2 rounded-lg border border-[#27314b] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {posterUrl && (
                    <div className="w-16 h-10 rounded-lg overflow-hidden border border-[#2b3552] shrink-0">
                      <img
                        src={posterUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 px-5 py-3.5 border-t border-[#1d2235] bg-[#0d0f17] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors text-center"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCreate(false)}
              disabled={!title.trim() || isUploading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1b2236] hover:bg-[#252f4c] disabled:opacity-50 text-white text-xs font-bold rounded-lg border border-[#2e3b5e] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Create Playlist</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreate(true)}
              disabled={!title.trim() || isUploading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-red-950/40"
            >
              <FileVideo className="w-4 h-4" />
              <span>Create & Add Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
