// ── Player Source Routes ──────────────────────────────────────────────────────
// Embed URL generation (instant) + Puppeteer-based .m3u8 resolution (slow)

import { Router } from 'express';
import { PLAYER_SOURCES, getSourceById } from '../utils/constants.js';
import { getDb } from '../services/db.js';
import fs from 'node:fs';

let streamExtractor = null;

// Lazy-load Puppeteer stream extractor — fails gracefully if not installed
async function getStreamExtractor() {
  if (streamExtractor !== null) return streamExtractor;
  try {
    const mod = await import('../services/streamExtractor.js');
    streamExtractor = mod;
    return streamExtractor;
  } catch {
    streamExtractor = false; // mark as unavailable
    return false;
  }
}

/**
 * @param {{ tmdbFetch: Function }} tmdbClient — unused for now, reserved for future enrichment
 */
export function createSourcesRouter(tmdbClient) {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/sources — list all available player sources
  router.get('/', (req, res) => {
    res.json(
      PLAYER_SOURCES.map(({ id, label, supportsProgress, colorParam, langParam }) => ({
        id,
        label,
        supportsProgress,
        colorParam,
        langParam,
      }))
    );
  });

  // GET /api/sources/embed/:source/movie/:id — instant embed URL
  router.get('/embed/:source/movie/:id', asyncHandler(async (req, res) => {
    const db = await getDb();
    const local = await db.get('SELECT * FROM local_media WHERE tmdb_id = ? AND media_type = ?', [req.params.id, 'movie']);
    if (local) {
      return res.json({ embedUrl: `/api/sources/local-stream?path=${encodeURIComponent(local.file_path)}`, source: 'local', isLocal: true });
    }
    
    const source = getSourceById(req.params.source);
    if (!source) return res.status(404).json({ error: `Unknown source: ${req.params.source}` });
    const embedUrl = source.movieUrl(req.params.id);
    res.json({ embedUrl, source: source.id });
  }));

  // GET /api/sources/embed/:source/tv/:id/:season/:episode — instant embed URL
  router.get('/embed/:source/tv/:id/:season/:episode', asyncHandler(async (req, res) => {
    const db = await getDb();
    const local = await db.get('SELECT * FROM local_media WHERE tmdb_id = ? AND media_type = ?', [req.params.id, 'tv']);
    if (local) {
      return res.json({ embedUrl: `/api/sources/local-stream?path=${encodeURIComponent(local.file_path)}`, source: 'local', isLocal: true });
    }
    
    const source = getSourceById(req.params.source);
    if (!source) return res.status(404).json({ error: `Unknown source: ${req.params.source}` });
    const embedUrl = source.tvUrl(req.params.id, req.params.season, req.params.episode);
    res.json({ embedUrl, source: source.id });
  }));

  // GET /api/sources/local-stream — stream local files via range requests
  router.get('/local-stream', (req, res) => {
    const filePath = decodeURIComponent(req.query.path);
    if (!fs.existsSync(filePath)) return res.sendStatus(404);
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  async function resolveBest(type, id, season, episode) {
    const extractor = await getStreamExtractor();
    if (!extractor) {
      throw new Error('Puppeteer not installed. Use /embed endpoints instead.');
    }

    // Rank 1: vidsrc, Rank 2: vidking, Rank 3: videasy
    const sources = PLAYER_SOURCES.map(s => ({
      ...s,
      rank: s.id === 'vidsrc' ? 1 : s.id === 'vidking' ? 2 : 3,
      embedUrl: type === 'movie' ? s.movieUrl(id) : s.tvUrl(id, season, episode)
    }));

    return new Promise((resolve, reject) => {
      let bestResult = null;
      let completedCount = 0;
      let timeoutId = null;

      const evaluateAndReturn = (result, source) => {
        if (!result.m3u8Url) return; // invalid
        
        // Is it the highest possible rank?
        if (source.rank === 1) {
          if (timeoutId) clearTimeout(timeoutId);
          return resolve({ ...result, source: source.id });
        }

        // It's a lower rank source. Save it if it's better than current.
        if (!bestResult || source.rank < bestResult.source.rank) {
          bestResult = { result, source };
          
          // Give better sources a 2.5s grace period to arrive
          if (!timeoutId) {
            timeoutId = setTimeout(() => {
              if (bestResult) resolve({ ...bestResult.result, source: bestResult.source.id });
            }, 2500);
          }
        }
      };

      sources.forEach(source => {
        extractor.resolve(source.embedUrl)
          .then(result => {
            evaluateAndReturn(result, source);
          })
          .catch(() => {})
          .finally(() => {
            completedCount++;
            if (completedCount === sources.length) {
              if (timeoutId) clearTimeout(timeoutId);
              if (bestResult) resolve({ ...bestResult.result, source: bestResult.source.id });
              else reject(new Error('resolution_failed'));
            }
          });
      });
    });
  }

  // POST /api/sources/resolve/movie/:id
  router.post('/resolve/movie/:id', asyncHandler(async (req, res) => {
    const sourceId = req.body?.source || 'auto';
    
    if (sourceId === 'auto') {
      try {
        const best = await resolveBest('movie', req.params.id);
        return res.json(best);
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    const extractor = await getStreamExtractor();
    if (!extractor) return res.status(501).json({ error: 'Puppeteer not installed.' });
    const source = getSourceById(sourceId);
    if (!source) return res.status(404).json({ error: `Unknown source: ${sourceId}` });

    const embedUrl = source.movieUrl(req.params.id);
    const result = await extractor.resolve(embedUrl);
    res.json({ ...result, source: sourceId });
  }));

  // POST /api/sources/resolve/tv/:id/:season/:episode
  router.post('/resolve/tv/:id/:season/:episode', asyncHandler(async (req, res) => {
    const sourceId = req.body?.source || 'auto';
    
    if (sourceId === 'auto') {
      try {
        const best = await resolveBest('tv', req.params.id, req.params.season, req.params.episode);
        return res.json(best);
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    const extractor = await getStreamExtractor();
    if (!extractor) return res.status(501).json({ error: 'Puppeteer not installed.' });
    const source = getSourceById(sourceId);
    if (!source) return res.status(404).json({ error: `Unknown source: ${sourceId}` });

    const embedUrl = source.tvUrl(req.params.id, req.params.season, req.params.episode);
    const result = await extractor.resolve(embedUrl);
    res.json({ ...result, source: sourceId });
  }));

  return router;
}
