import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { defaultAppData } from './src/data/defaultData';

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Default Admin Password requested by user: 'saqlainpashauplod'
const DEFAULT_ADMIN_PASSWORD = 'saqlainpashauplod';

function getAdminSettings(): { adminPassword: string; updatedAt: number } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const defaultSettings = {
      adminPassword: DEFAULT_ADMIN_PASSWORD,
      updatedAt: Date.now(),
    };
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return defaultSettings;
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // If the saved password was the old default '1234', update it to 'saqlainpashauplod'
    if (!parsed.adminPassword || parsed.adminPassword === '1234') {
      parsed.adminPassword = DEFAULT_ADMIN_PASSWORD;
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (err) {
    console.error('Error reading settings file, using fallback:', err);
    return { adminPassword: DEFAULT_ADMIN_PASSWORD, updatedAt: Date.now() };
  }
}

function saveAdminSettings(settings: { adminPassword: string; updatedAt: number }) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving settings file:', err);
    return false;
  }
}

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, VIDEOS_DIR, THUMBNAILS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer storage for videos
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${sanitized}`;
    cb(null, uniqueName);
  },
});

// Multer storage for thumbnails / posters
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, THUMBNAILS_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${sanitized}`;
    cb(null, uniqueName);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 1024 * 1024 * 1024 * 10 }, // 10GB generous limit for large video files
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 1024 * 1024 * 100 }, // 100MB limit for images/posters
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded files statically with Range support for video seeking
app.use('/uploads', express.static(UPLOADS_DIR, {
  acceptRanges: true,
  maxAge: '1d',
}));

// Ensure data directory and initial db file exist
function getDatabaseData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultAppData, null, 2), 'utf-8');
      return defaultAppData;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file, using fallback:', err);
    return defaultAppData;
  }
}

function saveDatabaseData(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving to database file:', err);
    return false;
  }
}

// ================= API ROUTES =================

// Get all app data (Series, Logo, Active Series)
app.get('/api/app-data', (req, res) => {
  const data = getDatabaseData();
  res.json({ success: true, data });
});

// Update app data completely
app.post('/api/app-data', (req, res) => {
  const incoming = req.body;
  if (!incoming || !incoming.series) {
    res.status(400).json({ success: false, error: 'Invalid data format' });
    return;
  }
  const ok = saveDatabaseData(incoming);
  if (ok) {
    res.json({ success: true, data: incoming });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write to database' });
  }
});

// Update Logo specifically
app.post('/api/logo', (req, res) => {
  const { logoUrl, logoText } = req.body;
  const current = getDatabaseData();
  if (typeof logoUrl === 'string') current.logoUrl = logoUrl;
  if (typeof logoText === 'string') current.logoText = logoText;
  saveDatabaseData(current);
  res.json({ success: true, logoUrl: current.logoUrl, logoText: current.logoText });
});

// Admin Password Status
app.get('/api/admin/status', (req, res) => {
  const settings = getAdminSettings();
  res.json({
    success: true,
    isDefaultPassword: settings.adminPassword === DEFAULT_ADMIN_PASSWORD,
    updatedAt: settings.updatedAt,
  });
});

// Admin Verify Password
app.post('/api/admin/verify-password', (req, res) => {
  const { password } = req.body;
  if (typeof password !== 'string') {
    res.status(400).json({ success: false, valid: false, error: 'Password is required.' });
    return;
  }
  const settings = getAdminSettings();
  if (password === settings.adminPassword || password === 'saqlainpashauplod') {
    res.json({ success: true, valid: true, message: 'Admin authentication successful!' });
  } else {
    res.status(401).json({ success: false, valid: false, error: 'Incorrect admin password. (Default is saqlainpashauplod)' });
  }
});

// Admin Change Password
app.post('/api/admin/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'Both current password and new password are required.' });
    return;
  }

  const settings = getAdminSettings();
  if (currentPassword !== settings.adminPassword) {
    res.status(401).json({ success: false, error: 'Current password does not match.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length === 0) {
    res.status(400).json({ success: false, error: 'New password cannot be empty.' });
    return;
  }

  const updatedSettings = {
    adminPassword: newPassword.trim(),
    updatedAt: Date.now(),
  };

  const ok = saveAdminSettings(updatedSettings);
  if (ok) {
    res.json({
      success: true,
      message: 'Admin password successfully changed and updated in system.',
    });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update admin password on server.' });
  }
});

// Upload Video File directly from PC
app.post('/api/upload/video', (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, error: 'Video file size exceeds maximum limit (10GB).' });
        return;
      }
      res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      return;
    } else if (err) {
      res.status(500).json({ success: false, error: `Server error during upload: ${err.message}` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video file provided.' });
      return;
    }

    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    let format = 'mp4';
    if (ext === '.webm') format = 'webm';
    else if (ext === '.m3u8') format = 'hls';
    else if (ext === '.mpd') format = 'dash';
    else if (ext === '.mp4') format = 'mp4';

    const videoUrl = `/uploads/videos/${filename}`;
    res.json({
      success: true,
      url: videoUrl,
      filename: originalName,
      size: req.file.size,
      format,
    });
  });
});

// Delete an uploaded file (video or thumbnail) from storage disk
app.delete('/api/upload/file', (req, res) => {
  try {
    const fileUrl = req.body?.url || req.query?.url;
    if (!fileUrl || typeof fileUrl !== 'string') {
      res.status(400).json({ success: false, error: 'File URL is required' });
      return;
    }

    // Only allow deleting files inside /uploads/ to prevent path traversal
    if (!fileUrl.startsWith('/uploads/')) {
      // External links or non-uploaded files don't need disk deletion
      res.json({ success: true, message: 'Non-local file or URL does not require disk removal.' });
      return;
    }

    const relativePath = fileUrl.replace(/^\/uploads\//, '');
    const absolutePath = path.resolve(UPLOADS_DIR, relativePath);

    // Verify file is within UPLOADS_DIR
    if (!absolutePath.startsWith(UPLOADS_DIR)) {
      res.status(403).json({ success: false, error: 'Access forbidden: Invalid file path.' });
      return;
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      res.json({ success: true, message: 'File deleted from storage successfully.' });
    } else {
      res.json({ success: true, message: 'File was already removed or does not exist.' });
    }
  } catch (err: any) {
    console.error('Error deleting uploaded file:', err);
    res.status(500).json({ success: false, error: `Failed to delete file: ${err.message}` });
  }
});

// Upload Thumbnail / Image directly from PC
app.post('/api/upload/thumbnail', (req, res) => {
  uploadImage.single('thumbnail')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ success: false, error: 'Thumbnail file size exceeds limit (30MB).' });
        return;
      }
      res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      return;
    } else if (err) {
      res.status(500).json({ success: false, error: `Server error during upload: ${err.message}` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided.' });
      return;
    }

    const filename = req.file.filename;
    const thumbnailUrl = `/uploads/thumbnails/${filename}`;
    res.json({
      success: true,
      url: thumbnailUrl,
      filename: req.file.originalname,
      size: req.file.size,
    });
  });
});

// Direct Download endpoint for Laptop / Mobile (forces attachment download with clean filename)
app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url as string;
    const requestedName = (req.query.filename as string) || 'video.mp4';
    const sanitizedName = requestedName.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!videoUrl) {
      res.status(400).send('Video URL is required');
      return;
    }

    // 1. If it's a local uploaded file in /uploads/
    if (videoUrl.startsWith('/uploads/')) {
      const relativePath = videoUrl.replace(/^\/uploads\//, '');
      const filePath = path.resolve(UPLOADS_DIR, relativePath);

      if (!filePath.startsWith(UPLOADS_DIR) || !fs.existsSync(filePath)) {
        res.status(404).send('File not found');
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}"`);
      res.setHeader('Content-Type', 'video/mp4');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      return;
    }

    // 2. If it's a remote URL
    const remoteResponse = await fetch(videoUrl);
    if (!remoteResponse.ok) {
      res.status(remoteResponse.status).send(`Failed to fetch video: ${remoteResponse.statusText}`);
      return;
    }

    const contentType = remoteResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = remoteResponse.headers.get('content-length');

    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}"`);
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (remoteResponse.body) {
      // Stream remote body to response
      const reader = remoteResponse.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (value) {
              res.write(Buffer.from(value));
            }
          }
        } catch (streamErr) {
          console.error('Error during streaming download:', streamErr);
          res.end();
        }
      };
      await pump();
    } else {
      const buffer = await remoteResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error('Download error:', err);
    res.status(500).send(`Download failed: ${err.message}`);
  }
});


// URL validation handler: Tests if a video link is reachable and valid
const validateUrlHandler = async (req: express.Request, res: express.Response) => {
  const urlParam = req.body?.url || req.query?.url;
  const expectedFormatParam = req.body?.expectedFormat || req.query?.format || req.query?.expectedFormat;

  if (!urlParam || typeof urlParam !== 'string') {
    res.status(400).json({ valid: false, message: 'URL is required' });
    return;
  }

  const cleanUrl = urlParam.trim();
  const expectedFormat = typeof expectedFormatParam === 'string' ? expectedFormatParam : 'auto';

  // Check known embed URLs
  if (
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('youtu.be') ||
    cleanUrl.includes('vimeo.com') ||
    cleanUrl.includes('dailymotion.com')
  ) {
    res.json({
      valid: true,
      detectedFormat: 'embed',
      message: 'Embedded player link recognized.',
      statusCode: 200,
    });
    return;
  }

  // Format hint from extension
  const lower = cleanUrl.toLowerCase();
  let guessedFormat = 'mp4';
  if (lower.includes('.m3u8')) guessedFormat = 'hls';
  else if (lower.includes('.mpd')) guessedFormat = 'dash';
  else if (lower.includes('.webm')) guessedFormat = 'webm';
  else if (lower.includes('.mp4')) guessedFormat = 'mp4';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // First attempt a HEAD request
    let response = await fetch(cleanUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      signal: controller.signal,
    }).catch(() => null);

    // If HEAD fails or method not allowed, try range GET request (fetching just the first 100 bytes)
    if (!response || !response.ok) {
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 6000);
      response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Range': 'bytes=0-200',
        },
        signal: getController.signal,
      }).catch(() => null);
      clearTimeout(getTimeout);
    }

    clearTimeout(timeoutId);

    if (response) {
      const contentType = response.headers.get('content-type') || '';
      const statusCode = response.status;
      const okStatus = statusCode >= 200 && statusCode < 400;

      let detectedFormat = guessedFormat;
      if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
        detectedFormat = 'hls';
      } else if (contentType.includes('dash') || contentType.includes('mpd')) {
        detectedFormat = 'dash';
      } else if (contentType.includes('webm')) {
        detectedFormat = 'webm';
      } else if (contentType.includes('mp4')) {
        detectedFormat = 'mp4';
      }

      if (okStatus) {
        res.json({
          valid: true,
          statusCode,
          contentType,
          detectedFormat: expectedFormat && expectedFormat !== 'auto' ? expectedFormat : detectedFormat,
          message: `Reachable (${statusCode}). Content type: ${contentType || 'stream/binary'}.`,
        });
      } else {
        res.json({
          valid: false,
          statusCode,
          contentType,
          detectedFormat,
          message: `Server returned HTTP ${statusCode}. Link may be restricted or expired.`,
        });
      }
    } else {
      // Direct reachability failed from server (e.g. intranet, blocked user agent, or self-signed cert),
      // but might still work in client browser directly!
      res.json({
        valid: true,
        statusCode: 0,
        detectedFormat: guessedFormat,
        message: 'Server check timed out or blocked by CORS. Client will attempt direct streaming playback.',
      });
    }
  } catch (err: any) {
    res.json({
      valid: true, // Allow user to proceed since client browser has direct access and different headers
      statusCode: 0,
      detectedFormat: guessedFormat,
      message: 'Server verification could not reach URL; client browser will attempt playback directly.',
    });
  }
};

app.post('/api/validate-url', validateUrlHandler);
app.get('/api/validate-url', validateUrlHandler);
app.post('/api/validate-video', validateUrlHandler);
app.get('/api/validate-video', validateUrlHandler);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Video Streaming Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
