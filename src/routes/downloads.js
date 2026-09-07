// ── Download Routes ───────────────────────────────────────────────────────────
// CRUD operations and SSE endpoint for progress updates

import { Router } from 'express';
import * as downloadManager from '../services/downloadManager.js';

export function createDownloadsRouter() {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/downloads — list all downloads
  router.get('/', (req, res) => {
    res.json(downloadManager.getDownloads());
  });

  // POST /api/downloads — start a new download
  router.post('/', asyncHandler(async (req, res) => {
    const { m3u8Url, name, outputDir, tmdbId, mediaType, season, episode, posterPath } = req.body;
    if (!m3u8Url || !name || !outputDir) {
      return res.status(400).json({ error: 'm3u8Url, name, and outputDir are required' });
    }

    try {
      const download = downloadManager.startDownload({
        m3u8Url,
        name,
        outputDir,
        tmdbId,
        mediaType,
        season,
        episode,
        posterPath,
      });
      res.json(download);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  }));

  // DELETE /api/downloads/:id — cancel/delete a download
  router.delete('/:id', (req, res) => {
    const deleteFile = req.query.deleteFile === 'true';
    downloadManager.deleteDownload(req.params.id, deleteFile);
    res.json({ success: true });
  });

  // POST /api/downloads/cancel/:id — cancel a running download without deleting record
  router.post('/cancel/:id', (req, res) => {
    downloadManager.cancelDownload(req.params.id);
    res.json({ success: true });
  });

  // POST /api/downloads/check-binary — validate downloader binary
  router.post('/check-binary', (req, res) => {
    res.json(downloadManager.validateBinary());
  });

  // GET /api/downloads/progress — Server-Sent Events stream
  router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection immediately

    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    downloadManager.progressEmitter.on('progress', onProgress);

    // Initial payload: send all active downloads
    res.write(`data: ${JSON.stringify({ initial: downloadManager.getDownloads() })}\n\n`);

    req.on('close', () => {
      downloadManager.progressEmitter.off('progress', onProgress);
    });
  });

  return router;
}
