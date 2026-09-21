/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { Header } from './components/Header';
import { TopChannelBar } from './components/TopChannelBar';
import { SeriesInfo } from './components/SeriesInfo';
import { VideoPlayer } from './components/VideoPlayer';
import { EpisodeList } from './components/EpisodeList';
import { AdminModal } from './components/AdminModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { ReplaceLinkModal } from './components/ReplaceLinkModal';
import { QuickAddEpisodeModal } from './components/QuickAddEpisodeModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { LibraryView } from './components/LibraryView';
import { DownloadsPage } from './components/DownloadsPage';
import { ContentRequestsPage } from './components/ContentRequestsPage';
import { DownloadModal } from './components/DownloadModal';
import { AuthModal } from './components/AuthModal';
import { ShareUrlModal } from './components/ShareUrlModal';
import { ContinueWatching } from './components/ContinueWatching';
import { AppConfig, Episode, VideoFormat, User, OfflineVideo, Series, Season } from './types';
import { defaultAppData } from './data/defaultData';
import { deleteUploadedFile } from './utils/fileUploader';
import { getCurrentUser, logoutUser } from './utils/auth';
import { recordWatchProgress } from './utils/userHistory';
import { isAdminSessionUnlocked, setAdminSessionUnlocked, clearAdminSession } from './utils/adminAuth';
import {
  getAllOfflineVideos,
  deleteOfflineVideo as removeOfflineVideoFromDB,
  clearAllOfflineVideos as clearAllFromDB,
} from './utils/offlineStorage';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(defaultAppData);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAddEpisodeOpen, setIsAddEpisodeOpen] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState<'episode' | 'playlist' | 'season'>('episode');
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [replaceLinkTarget, setReplaceLinkTarget] = useState<Episode | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Admin Security & Password Verification State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState<boolean>(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Download Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<{
    series?: Series | null;
    season?: Season | null;
    episode: Episode | null;
  } | null>(null);
  const [pendingDownloadTarget, setPendingDownloadTarget] = useState<{
    series?: Series | null;
    season?: Season | null;
    episode: Episode | null;
  } | null>(null);

  // Offline stored videos state
  const [offlineVideos, setOfflineVideos] = useState<OfflineVideo[]>([]);

  // Active Navigation Tab: 'player' | 'library' | 'downloads' | 'requests'
  const [activeNavTab, setActiveNavTab] = useState<'player' | 'library' | 'downloads' | 'requests'>('player');

  // Active Series, Season, and Episode state
  const [activeSeriesId, setActiveSeriesId] = useState<string>(config.activeSeriesId);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');

  // Playing an offline video currently
  const [playingOfflineVideo, setPlayingOfflineVideo] = useState<OfflineVideo | null>(null);

  // Helper to execute an action only if admin is authenticated (or trigger password modal)
  const runAsAdmin = useCallback(
    (action?: () => void) => {
      if (isAdminSessionUnlocked()) {
        setIsAdmin(true);
        if (action) action();
      } else {
        if (action) {
          setPendingAdminAction(() => action);
        } else {
          setPendingAdminAction(null);
        }
        setIsAdminPasswordModalOpen(true);
      }
    },
    []
  );

  // Check initial admin session status on mount
  useEffect(() => {
    if (isAdminSessionUnlocked()) {
      setIsAdmin(true);
    }
  }, []);

  // Refresh offline videos list from IndexedDB
  const refreshOfflineVideos = useCallback(async (userEmail?: string | null) => {
    try {
      const email = userEmail !== undefined ? userEmail : currentUser?.email;
      const list = await getAllOfflineVideos(email);
      setOfflineVideos(list);
    } catch (err) {
      console.warn('Error fetching offline videos from IndexedDB:', err);
    }
  }, [currentUser?.email]);

  // Initial load of auth user and offline videos
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    refreshOfflineVideos(user?.email);
  }, [refreshOfflineVideos]);

  // 1. Fetch initial configuration from database API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/app-data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setConfig(json.data);
          
          // Check for URL query params (e.g. ?series=...&season=...&episode=...)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlSeries = params.get('series');
            const urlSeason = params.get('season');
            const urlEpisode = params.get('episode');

            if (urlSeries && json.data.series.some((s: Series) => s.id === urlSeries)) {
              setActiveSeriesId(urlSeries);
              if (urlSeason) setSelectedSeasonId(urlSeason);
              if (urlEpisode) setSelectedEpisodeId(urlEpisode);
              return;
            }
          }

          if (json.data.activeSeriesId) {
            setActiveSeriesId(json.data.activeSeriesId);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch from server database, using local fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Current active series object
  const activeSeries = useMemo(() => {
    return (
      config.series.find((s) => s.id === activeSeriesId) ||
      config.series[0] ||
      defaultAppData.series[0]
    );
  }, [config.series, activeSeriesId]);

  // Sync selected season and episode when active series changes
  useEffect(() => {
    if (activeSeries && activeSeries.seasons.length > 0) {
      // If current seasonId is not in this series, select the first season
      const seasonExists = activeSeries.seasons.some((s) => s.id === selectedSeasonId);
      const currentSeason = seasonExists
        ? activeSeries.seasons.find((s) => s.id === selectedSeasonId)!
        : activeSeries.seasons[0];

      if (!seasonExists) {
        setSelectedSeasonId(currentSeason.id);
      }

      // If current episodeId is not in current season, select the first episode
      const episodeExists = currentSeason.episodes.some((e) => e.id === selectedEpisodeId);
      if (!episodeExists && currentSeason.episodes.length > 0) {
        setSelectedEpisodeId(currentSeason.episodes[0].id);
      }
    }
  }, [activeSeries, selectedSeasonId, selectedEpisodeId]);

  // Current season object
  const currentSeason = useMemo(() => {
    if (!activeSeries || !activeSeries.seasons) return null;
    return (
      activeSeries.seasons.find((s) => s.id === selectedSeasonId) ||
      activeSeries.seasons[0] ||
      null
    );
  }, [activeSeries, selectedSeasonId]);

  // Current episode object
  const currentEpisode = useMemo(() => {
    if (!currentSeason || !currentSeason.episodes) return null;
    return (
      currentSeason.episodes.find((e) => e.id === selectedEpisodeId) ||
      currentSeason.episodes[0] ||
      null
    );
  }, [currentSeason, selectedEpisodeId]);

  // Handle Season switch
  const handleSelectSeason = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const targetSeason = activeSeries?.seasons.find((s) => s.id === seasonId);
    if (targetSeason && targetSeason.episodes.length > 0) {
      setSelectedEpisodeId(targetSeason.episodes[0].id);
    }
  };

  // Handle Episode selection: immediate switch without full page reload
  const handleSelectEpisode = (ep: Episode) => {
    setSelectedEpisodeId(ep.id);
  };

  // Handle auto-advance to next episode when current video ends
  const handleVideoEnded = () => {
    if (!currentSeason) return;
    const currentIndex = currentSeason.episodes.findIndex((e) => e.id === selectedEpisodeId);
    if (currentIndex >= 0 && currentIndex < currentSeason.episodes.length - 1) {
      // Next episode in same season
      setSelectedEpisodeId(currentSeason.episodes[currentIndex + 1].id);
    } else {
      // Try next season
      const seasonIndex = activeSeries.seasons.findIndex((s) => s.id === currentSeason.id);
      if (seasonIndex >= 0 && seasonIndex < activeSeries.seasons.length - 1) {
        const nextSeason = activeSeries.seasons[seasonIndex + 1];
        setSelectedSeasonId(nextSeason.id);
        if (nextSeason.episodes.length > 0) {
          setSelectedEpisodeId(nextSeason.episodes[0].id);
        }
      }
    }
  };

  // Save updated config permanently to backend database
  const handleSaveConfig = async (newConfig: AppConfig): Promise<boolean> => {
    try {
      const res = await fetch('/api/app-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(newConfig);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error saving config permanently:', err);
      // Still update in memory so the user sees their changes
      setConfig(newConfig);
      return true;
    }
  };

  // Quick replace video link or thumbnail for an episode
  const handleSaveNewLink = (
    episodeId: string,
    newUrl: string,
    newFormat: VideoFormat,
    newThumbnailUrl?: string,
    newQuality?: string,
    newResolution?: { width: number; height: number }
  ) => {
    const updatedSeries = config.series.map((series) => {
      if (series.id === activeSeries.id) {
        const updatedSeasons = series.seasons.map((season) => {
          return {
            ...season,
            episodes: season.episodes.map((ep) => {
              if (ep.id === episodeId) {
                return {
                  ...ep,
                  videoUrl: newUrl,
                  videoFormat: newFormat,
                  ...(newThumbnailUrl !== undefined ? { thumbnailUrl: newThumbnailUrl } : {}),
                  ...(newQuality !== undefined ? { quality: newQuality } : {}),
                  ...(newResolution !== undefined ? { resolution: newResolution } : {}),
                };
              }
              return ep;
            }),
          };
        });
        return { ...series, seasons: updatedSeasons };
      }
      return series;
    });

    const newConfig = { ...config, series: updatedSeries };
    handleSaveConfig(newConfig);
  };

  // Handle Quick Add Episode
  const handleAddEpisode = (params: {
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
  }) => {
    const newEpId = `ep-${Date.now()}`;
    const newEpisode: Episode = {
      id: newEpId,
      episodeNumber: params.episodeNumber,
      title: params.title,
      videoUrl: params.videoUrl,
      videoFormat: params.videoFormat,
      duration: params.duration,
      quality: params.quality,
      resolution: params.resolution,
      thumbnailUrl: params.thumbnailUrl,
    };

    const updatedSeries = config.series.map((series) => {
      if (series.id === params.seriesId) {
        const updatedSeasons = series.seasons.map((season) => {
          if (season.id === params.seasonId) {
            return {
              ...season,
              episodes: [...season.episodes, newEpisode],
            };
          }
          return season;
        });
        return { ...series, seasons: updatedSeasons };
      }
      return series;
    });

    const newConfig = { ...config, series: updatedSeries };
    handleSaveConfig(newConfig);

    // Switch view to this series, season and new episode
    setActiveSeriesId(params.seriesId);
    setSelectedSeasonId(params.seasonId);
    setSelectedEpisodeId(newEpId);
  };

  // Handle Create New Series / Playlist
  const handleCreateSeries = (title: string, description?: string, posterUrl?: string) => {
    const seriesId = `series-${Date.now()}`;
    const seasonId = `season-${Date.now()}`;
    const newSeries = {
      id: seriesId,
      title,
      description: description || '',
      posterUrl: posterUrl || '',
      seasons: [
        {
          id: seasonId,
          seasonNumber: 1,
          title: 'Season 1',
          episodes: [],
        },
      ],
    };

    const newConfig = {
      ...config,
      activeSeriesId: seriesId,
      series: [...config.series, newSeries],
    };

    handleSaveConfig(newConfig);
    setActiveSeriesId(seriesId);
    setSelectedSeasonId(seasonId);
    setSelectedEpisodeId('');

    return { seriesId, seasonId };
  };

  // Handle Create New Season / Arc in Series
  const handleCreateSeason = (title: string, seriesIdParam?: string) => {
    const targetId = seriesIdParam || activeSeries?.id;
    if (!targetId) return;
    const target = config.series.find((s) => s.id === targetId) || activeSeries;
    if (!target) return;

    const seasonId = `season-${Date.now()}`;
    const nextSeasonNum = target.seasons.length + 1;
    const newSeason = {
      id: seasonId,
      seasonNumber: nextSeasonNum,
      title: title || `Season ${nextSeasonNum}`,
      episodes: [],
    };

    const updatedSeries = config.series.map((s) => {
      if (s.id === target.id) {
        return {
          ...s,
          seasons: [...s.seasons, newSeason],
        };
      }
      return s;
    });

    const newConfig = { ...config, series: updatedSeries };
    handleSaveConfig(newConfig);
    setSelectedSeasonId(seasonId);
    setSelectedEpisodeId('');

    return seasonId;
  };

  // Handle Delete / Remove Episode
  const handleDeleteEpisode = (episodeId: string) => {
    if (!activeSeries || !selectedSeasonId) return;

    const targetSeason = activeSeries.seasons.find((s) => s.id === selectedSeasonId);
    const targetEpisode = targetSeason?.episodes.find((ep) => ep.id === episodeId);

    // If it was an uploaded file on disk, clean up from server storage
    if (targetEpisode?.videoUrl && targetEpisode.videoUrl.startsWith('/uploads/')) {
      deleteUploadedFile(targetEpisode.videoUrl).catch(() => {});
    }
    if (targetEpisode?.thumbnailUrl && targetEpisode.thumbnailUrl.startsWith('/uploads/')) {
      deleteUploadedFile(targetEpisode.thumbnailUrl).catch(() => {});
    }

    const updatedSeries = config.series.map((s) => {
      if (s.id === activeSeries.id) {
        const updatedSeasons = s.seasons.map((season) => {
          if (season.id === selectedSeasonId) {
            return {
              ...season,
              episodes: season.episodes.filter((ep) => ep.id !== episodeId),
            };
          }
          return season;
        });
        return { ...s, seasons: updatedSeasons };
      }
      return s;
    });

    const newConfig = { ...config, series: updatedSeries };
    handleSaveConfig(newConfig);

    // If currently selected episode was deleted, switch to another episode or clear
    if (selectedEpisodeId === episodeId) {
      const remaining = targetSeason?.episodes.filter((ep) => ep.id !== episodeId) || [];
      if (remaining.length > 0) {
        setSelectedEpisodeId(remaining[0].id);
      } else {
        setSelectedEpisodeId('');
      }
    }
  };

  // Handle Delete Series / Entire Playlist
  const handleDeleteSeries = (seriesId: string) => {
    const targetSeries = config.series.find((s) => s.id === seriesId);
    if (!targetSeries) return;

    // Clean up all uploaded videos and thumbnails on disk for this entire playlist
    targetSeries.seasons.forEach((season) => {
      season.episodes.forEach((ep) => {
        if (ep.videoUrl && ep.videoUrl.startsWith('/uploads/')) {
          deleteUploadedFile(ep.videoUrl).catch(() => {});
        }
        if (ep.thumbnailUrl && ep.thumbnailUrl.startsWith('/uploads/')) {
          deleteUploadedFile(ep.thumbnailUrl).catch(() => {});
        }
      });
    });

    const remainingSeries = config.series.filter((s) => s.id !== seriesId);

    // If all series were deleted, create a fresh empty default series
    const finalSeriesList =
      remainingSeries.length > 0
        ? remainingSeries
        : [
            {
              id: `series-${Date.now()}`,
              title: 'My Playlist',
              description: 'New playlist ready for your video uploads.',
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

    const newActiveSeriesId =
      activeSeriesId === seriesId ? finalSeriesList[0].id : activeSeriesId;

    const newConfig: AppConfig = {
      ...config,
      activeSeriesId: newActiveSeriesId,
      series: finalSeriesList,
    };

    handleSaveConfig(newConfig);
    setActiveSeriesId(newActiveSeriesId);
    if (finalSeriesList[0]?.seasons[0]) {
      setSelectedSeasonId(finalSeriesList[0].seasons[0].id);
      setSelectedEpisodeId(finalSeriesList[0].seasons[0].episodes[0]?.id || '');
    }
  };

  // Reset to default sample series
  const handleResetDemo = () => {
    handleSaveConfig(defaultAppData);
    setActiveSeriesId(defaultAppData.activeSeriesId);
    setSelectedSeasonId(defaultAppData.series[0].seasons[0].id);
    setSelectedEpisodeId(defaultAppData.series[0].seasons[0].episodes[0].id);
  };

  // Open Download Modal for currently active episode/video
  const handleOpenDownloadCurrent = () => {
    if (!currentEpisode) return;
    const target = {
      series: activeSeries,
      season: currentSeason,
      episode: currentEpisode,
    };
    if (!currentUser) {
      setPendingDownloadTarget(target);
      setIsAuthModalOpen(true);
      return;
    }
    setDownloadTarget(target);
    setIsDownloadModalOpen(true);
  };

  // Open Download Modal for a specific episode from playlist list or library
  const handleOpenDownloadEpisode = (ep: Episode, targetSeries?: Series | null, targetSeason?: Season | null) => {
    const target = {
      series: targetSeries || activeSeries,
      season: targetSeason || currentSeason,
      episode: ep,
    };
    if (!currentUser) {
      setPendingDownloadTarget(target);
      setIsAuthModalOpen(true);
      return;
    }
    setDownloadTarget(target);
    setIsDownloadModalOpen(true);
  };

  // Play an offline video
  const handlePlayOfflineVideo = (video: OfflineVideo) => {
    setPlayingOfflineVideo(video);
  };

  // Offline video blob URL generator
  const offlineBlobUrl = useMemo(() => {
    if (playingOfflineVideo?.videoBlob) {
      return URL.createObjectURL(playingOfflineVideo.videoBlob);
    }
    return '';
  }, [playingOfflineVideo]);

  useEffect(() => {
    return () => {
      if (offlineBlobUrl) {
        URL.revokeObjectURL(offlineBlobUrl);
      }
    };
  }, [offlineBlobUrl]);

  return (
    <div className="min-h-screen bg-[#090b10] text-gray-100 flex flex-col selection:bg-red-600 selection:text-white antialiased">
      {/* Top Channel Bar */}
      <TopChannelBar />

      {/* 1. Header with Logo, Add Episode, New Playlist & Admin Setup Button & User Auth */}
      <Header
        logoUrl={config.logoUrl}
        logoText={config.logoText}
        seriesList={config.series}
        activeSeriesId={activeSeriesId}
        activeNavTab={activeNavTab}
        isAdmin={isAdmin}
        onLockAdmin={() => {
          clearAdminSession();
          setIsAdmin(false);
        }}
        onSelectNavTab={(tab) => {
          setActiveNavTab(tab);
          setPlayingOfflineVideo(null);
        }}
        onSelectSeries={(id) => {
          setActiveSeriesId(id);
          setActiveNavTab('player');
          setPlayingOfflineVideo(null);
        }}
        onOpenAdmin={() => runAsAdmin(() => setIsAdminOpen(true))}
        onOpenAddEpisode={() => {
          runAsAdmin(() => {
            setUploadModalTab('episode');
            setIsAddEpisodeOpen(true);
          });
        }}
        onOpenCreatePlaylist={() => {
          setIsCreatePlaylistOpen(true);
        }}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        downloadsCount={offlineVideos.length}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          logoutUser();
          setCurrentUser(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-7 flex flex-col">
        {activeNavTab === 'requests' ? (
          <ContentRequestsPage
            onBackToPlayer={() => {
              setActiveNavTab('player');
              setPlayingOfflineVideo(null);
            }}
          />
        ) : activeNavTab === 'downloads' ? (
          /* Dedicated Downloaded Videos / Offline Library Page */
          <DownloadsPage
            currentUser={currentUser}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onPlayOfflineVideo={handlePlayOfflineVideo}
            onPlayEpisodeOnline={(seriesId, seasonId, episodeId) => {
              setActiveSeriesId(seriesId);
              setSelectedSeasonId(seasonId);
              setSelectedEpisodeId(episodeId);
              setActiveNavTab('player');
              setPlayingOfflineVideo(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDownloadHistoryEpisode={(item) => {
              const s = config.series.find((x) => x.id === item.seriesId);
              const season = s?.seasons.find((x) => x.id === item.seasonId);
              const ep = season?.episodes.find((x) => x.id === item.episodeId);
              if (ep) {
                handleOpenDownloadEpisode(ep, s, season);
              }
            }}
            onBackToPlayer={() => {
              setActiveNavTab('player');
              setPlayingOfflineVideo(null);
            }}
          />
        ) : activeNavTab === 'library' ? (
          /* Dedicated Uploaded Videos & Playlists Library View */
          <LibraryView
            config={config}
            isAdmin={isAdmin}
            onRequireAdminUnlock={() => runAsAdmin()}
            onSelectEpisodeToPlay={(seriesId, seasonId, episodeId) => {
              setActiveSeriesId(seriesId);
              setSelectedSeasonId(seasonId);
              setSelectedEpisodeId(episodeId);
              setActiveNavTab('player');
              setPlayingOfflineVideo(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onEditEpisode={(seriesId, seasonId, ep) => {
              runAsAdmin(() => {
                setActiveSeriesId(seriesId);
                setSelectedSeasonId(seasonId);
                setReplaceLinkTarget(ep);
              });
            }}
            onDeleteEpisode={(seriesId, seasonId, episodeId) => {
              runAsAdmin(() => {
                const targetSeries = config.series.find((s) => s.id === seriesId);
                const targetSeason = targetSeries?.seasons.find((s) => s.id === seasonId);
                const targetEpisode = targetSeason?.episodes.find((e) => e.id === episodeId);

                if (targetEpisode?.videoUrl && targetEpisode.videoUrl.startsWith('/uploads/')) {
                  deleteUploadedFile(targetEpisode.videoUrl).catch(() => {});
                }
                if (targetEpisode?.thumbnailUrl && targetEpisode.thumbnailUrl.startsWith('/uploads/')) {
                  deleteUploadedFile(targetEpisode.thumbnailUrl).catch(() => {});
                }

                const updatedSeries = config.series.map((s) => {
                  if (s.id === seriesId) {
                    const updatedSeasons = s.seasons.map((season) => {
                      if (season.id === seasonId) {
                        return {
                          ...season,
                          episodes: season.episodes.filter((e) => e.id !== episodeId),
                        };
                      }
                      return season;
                    });
                    return { ...s, seasons: updatedSeasons };
                  }
                  return s;
                });
                const newConfig = { ...config, series: updatedSeries };
                handleSaveConfig(newConfig);
                if (selectedEpisodeId === episodeId) {
                  setSelectedEpisodeId('');
                }
              });
            }}
            onDeleteSeries={(seriesId) => {
              runAsAdmin(() => {
                handleDeleteSeries(seriesId);
              });
            }}
            onDownloadEpisode={(series, _seasonId, ep) => {
              const seasonObj = series.seasons.find((s) => s.id === _seasonId);
              handleOpenDownloadEpisode(ep, series, seasonObj);
            }}
            onOpenAddEpisode={() => {
              runAsAdmin(() => {
                setUploadModalTab('episode');
                setIsAddEpisodeOpen(true);
              });
            }}
            onOpenCreatePlaylist={() => {
              setIsCreatePlaylistOpen(true);
            }}
          />
        ) : activeSeries ? (
          <>
            {/* 2. Series / Anime Name & Information */}
            <SeriesInfo
              series={activeSeries}
              currentSeason={currentSeason}
              currentEpisode={currentEpisode}
              isAdmin={isAdmin}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />

            {/* 3. Large Responsive Video Player (with Corner & Controls Download Buttons) */}
            <div className="w-full mb-2">
              <VideoPlayer
                key={currentEpisode?.id || 'player'}
                url={currentEpisode?.videoUrl || ''}
                format={currentEpisode?.videoFormat || 'auto'}
                title={currentEpisode?.title}
                posterUrl={activeSeries.posterUrl}
                initialQuality={currentEpisode?.quality}
                isAdmin={isAdmin}
                onReplaceLink={() => {
                  if (currentEpisode) {
                    runAsAdmin(() => {
                      setReplaceLinkTarget(currentEpisode);
                    });
                  }
                }}
                onTimeUpdate={(curr, dur) => {
                  if (currentEpisode) {
                    recordWatchProgress(
                      currentEpisode,
                      activeSeries,
                      currentSeason,
                      curr,
                      dur,
                      currentUser?.email
                    );
                  }
                }}
                onEnded={handleVideoEnded}
                onOpenDownloadModal={handleOpenDownloadCurrent}
              />
            </div>

            {/* 4. Continue Watching Section (Last 5 Episodes Started by User) */}
            <ContinueWatching
              currentUser={currentUser}
              currentEpisodeId={selectedEpisodeId}
              onSelectEpisode={(seriesId, seasonId, episodeId) => {
                setActiveSeriesId(seriesId);
                setSelectedSeasonId(seasonId);
                setSelectedEpisodeId(episodeId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onViewAllHistory={() => {
                setActiveNavTab('downloads');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 5. Season Selector & Episode List */}
            <EpisodeList
              seriesId={activeSeries.id}
              seasons={activeSeries.seasons}
              selectedSeasonId={currentSeason?.id || ''}
              selectedEpisodeId={selectedEpisodeId}
              isAdmin={isAdmin}
              onSelectSeason={handleSelectSeason}
              onSelectEpisode={handleSelectEpisode}
              onEditEpisodeLink={(ep) => {
                runAsAdmin(() => {
                  setReplaceLinkTarget(ep);
                });
              }}
              onDeleteEpisode={(epId) => {
                runAsAdmin(() => {
                  handleDeleteEpisode(epId);
                });
              }}
              onDownloadEpisode={(ep) => handleOpenDownloadEpisode(ep, activeSeries, currentSeason)}
            />
          </>
        ) : (
          <div className="py-20 text-center text-gray-400">
            No series currently loaded. Click &quot;Admin Setup&quot; or &quot;New Playlist&quot; at the top to add your series.
          </div>
        )}
      </main>

      {/* Footer: Clean and minimal without clutter */}
      <footer className="w-full border-t border-[#171b26] py-5 px-4 text-center text-xs text-gray-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{config.logoText || 'STREAM'} Video Player</span>
          <span className="text-[11px] text-gray-600">
            Supports Direct MP4, WebM, HLS (.m3u8), DASH (.mpd), Mobile/Laptop & Website Offline Downloads
          </span>
        </div>
      </footer>

      {/* Video Download Selection Modal (Mobile, Laptop, Website Storage) */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => {
          setIsDownloadModalOpen(false);
          setDownloadTarget(null);
        }}
        series={downloadTarget?.series || activeSeries}
        season={downloadTarget?.season || currentSeason}
        episode={downloadTarget?.episode || currentEpisode}
        currentUser={currentUser}
        onRequireAuth={() => setIsAuthModalOpen(true)}
        onDownloadCompleted={() => {
          refreshOfflineVideos();
        }}
        onNavigateToDownloadsPage={() => {
          setIsDownloadModalOpen(false);
          setDownloadTarget(null);
          setActiveNavTab('downloads');
        }}
      />

      {/* User Authentication Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingDownloadTarget(null);
        }}
        onSuccess={(user: User) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          refreshOfflineVideos(user.email);
          if (pendingDownloadTarget) {
            setDownloadTarget(pendingDownloadTarget);
            setPendingDownloadTarget(null);
            setIsDownloadModalOpen(true);
          }
        }}
      />

      {/* Admin Password Gate Modal */}
      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => {
          setIsAdminPasswordModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={() => {
          setIsAdmin(true);
          setAdminSessionUnlocked(true);
          if (pendingAdminAction) {
            const actionToRun = pendingAdminAction;
            setPendingAdminAction(null);
            actionToRun();
          }
        }}
      />

      {/* Admin Setup Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onResetDemo={handleResetDemo}
      />

      {/* Quick Add Episode / Upload Center Modal */}
      <QuickAddEpisodeModal
        isOpen={isAddEpisodeOpen}
        onClose={() => setIsAddEpisodeOpen(false)}
        config={config}
        activeSeriesId={activeSeriesId}
        selectedSeasonId={selectedSeasonId}
        initialTab={uploadModalTab}
        onAddEpisode={handleAddEpisode}
        onCreateSeries={handleCreateSeries}
        onCreateSeason={handleCreateSeason}
      />

      {/* Create Playlist / Series Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        currentSeriesTitle={activeSeries?.title}
        onCreateSeries={handleCreateSeries}
        onCreateSeason={handleCreateSeason}
        onOpenUploadForSeries={(sId, seasonId) => {
          if (sId) setActiveSeriesId(sId);
          if (seasonId) setSelectedSeasonId(seasonId);
          setUploadModalTab('episode');
          setIsAddEpisodeOpen(true);
        }}
      />

      {/* Replace Video Link Modal */}
      <ReplaceLinkModal
        isOpen={Boolean(replaceLinkTarget)}
        onClose={() => setReplaceLinkTarget(null)}
        episode={replaceLinkTarget}
        onSaveNewLink={handleSaveNewLink}
      />

      {/* Share / Copy Playlist & Video URL Modal */}
      <ShareUrlModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        series={activeSeries}
        currentSeason={currentSeason}
        currentEpisode={currentEpisode}
      />

      {/* Offline Video Player Modal */}
      {playingOfflineVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-4xl bg-[#0e121e] border border-[#222b44] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d2438] bg-[#0c0f18]">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
                  Offline Mode Active
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {playingOfflineVideo.seriesTitle} - S{playingOfflineVideo.seasonNumber}E{playingOfflineVideo.episodeNumber}: {playingOfflineVideo.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Playing from local offline device storage ({Math.round(playingOfflineVideo.sizeBytes / (1024 * 1024))} MB) • Network not required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlayingOfflineVideo(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close Player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="p-4 bg-black flex-1 flex items-center justify-center">
              <div className="w-full aspect-video max-h-[75vh]">
                <VideoPlayer
                  url={offlineBlobUrl}
                  format="mp4"
                  title={`${playingOfflineVideo.seriesTitle} - E${playingOfflineVideo.episodeNumber}: ${playingOfflineVideo.title}`}
                  posterUrl={playingOfflineVideo.thumbnailUrl}
                  initialQuality={playingOfflineVideo.quality}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
