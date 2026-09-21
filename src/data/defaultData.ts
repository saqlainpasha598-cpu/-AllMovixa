import { AppConfig } from '../types';

export const defaultAppData: AppConfig = {
  logoUrl: '',
  logoText: 'STREAM',
  activeSeriesId: 'series-cyberpunk-odyssey',
  series: [
    {
      id: 'series-cyberpunk-odyssey',
      title: 'Neon Horizon: Origins',
      description: 'In a rain-soaked futuristic metropolis, a renegade data courier uncovers a clandestine neural streaming network.',
      posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
      seasons: [
        {
          id: 's1',
          seasonNumber: 1,
          title: 'Season 1',
          episodes: [
            {
              id: 's1-e01',
              episodeNumber: 1,
              title: 'The Awakening (HLS Stream)',
              videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              videoFormat: 'hls',
              duration: '10:34',
              description: 'The journey begins as signals trigger across the city grid.'
            },
            {
              id: 's1-e02',
              episodeNumber: 2,
              title: 'Silicon Dreams (MP4 Direct)',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              videoFormat: 'mp4',
              duration: '09:56',
              description: 'A deep dive into the hidden chambers of the central node.'
            },
            {
              id: 's1-e03',
              episodeNumber: 3,
              title: 'Binary Storm (HLS Bitmovin)',
              videoUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
              videoFormat: 'hls',
              duration: '52:10',
              description: 'Facing turbulence when the mainframe firewall engages.'
            },
            {
              id: 's1-e04',
              episodeNumber: 4,
              title: 'Chrono Drift (DASH Stream)',
              videoUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
              videoFormat: 'dash',
              duration: '09:56',
              description: 'Time dilation inside the high-bandwidth optical relay.'
            },
            {
              id: 's1-e05',
              episodeNumber: 5,
              title: 'Neural Cascade (MP4 High-Def)',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
              videoFormat: 'mp4',
              duration: '10:53',
              description: 'The cascading connection re-aligns the sensory array.'
            },
            {
              id: 's1-e06',
              episodeNumber: 6,
              title: 'Terminal Protocol (MP4 Finale)',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              videoFormat: 'mp4',
              duration: '00:15',
              description: 'The climax of season one unravels unexpected protocols.'
            }
          ]
        },
        {
          id: 's2',
          seasonNumber: 2,
          title: 'Season 2',
          episodes: [
            {
              id: 's2-e01',
              episodeNumber: 1,
              title: 'Return to Sub-level 9',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              videoFormat: 'mp4',
              duration: '12:14',
              description: 'Returning to the abandoned labs beneath sector four.'
            },
            {
              id: 's2-e02',
              episodeNumber: 2,
              title: 'Quantum Leap (HLS Multi-rate)',
              videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              videoFormat: 'hls',
              duration: '10:34',
              description: 'Experimenting with cross-dimensional bandwidth.'
            },
            {
              id: 's2-e03',
              episodeNumber: 3,
              title: 'Echoes in the Ether',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
              videoFormat: 'mp4',
              duration: '00:47',
              description: 'Deciphering transmissions bouncing off outer satellites.'
            }
          ]
        }
      ]
    }
  ]
};
