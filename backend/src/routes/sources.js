// ── Player Source Routes ──────────────────────────────────────────────────────
// Embed URL generation (instant) + Puppeteer-based .m3u8 resolution (slow)

import { Router } from 'express';
import { PLAYER_SOURCES, getSourceById } from '../utils/constants.js';

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
  router.get('/embed/:source/movie/:id', (req, res) => {
    const source = getSourceById(req.params.source);
    if (!source) return res.status(404).json({ error: `Unknown source: ${req.params.source}` });
    const embedUrl = source.movieUrl(req.params.id);
    res.json({ embedUrl, source: source.id });
  });

  // GET /api/sources/embed/:source/tv/:id/:season/:episode — instant embed URL
  router.get('/embed/:source/tv/:id/:season/:episode', (req, res) => {
    const source = getSourceById(req.params.source);
    if (!source) return res.status(404).json({ error: `Unknown source: ${req.params.source}` });
    const embedUrl = source.tvUrl(req.params.id, req.params.season, req.params.episode);
    res.json({ embedUrl, source: source.id });
  });

  // POST /api/sources/resolve/movie/:id — resolve .m3u8 via Puppeteer (slow)
  router.post('/resolve/movie/:id', asyncHandler(async (req, res) => {
    const extractor = await getStreamExtractor();
    if (!extractor) {
      return res.status(501).json({ error: 'Puppeteer not installed. Use /embed endpoints instead.' });
    }
    const sourceId = req.body?.source || 'videasy';
    const source = getSourceById(sourceId);
    if (!source) return res.status(404).json({ error: `Unknown source: ${sourceId}` });

    const embedUrl = source.movieUrl(req.params.id);
    const result = await extractor.resolve(embedUrl);
    res.json({ ...result, source: sourceId });
  }));

  // POST /api/sources/resolve/tv/:id/:season/:episode — resolve .m3u8 via Puppeteer (slow)
  router.post('/resolve/tv/:id/:season/:episode', asyncHandler(async (req, res) => {
    const extractor = await getStreamExtractor();
    if (!extractor) {
      return res.status(501).json({ error: 'Puppeteer not installed. Use /embed endpoints instead.' });
    }
    const sourceId = req.body?.source || 'videasy';
    const source = getSourceById(sourceId);
    if (!source) return res.status(404).json({ error: `Unknown source: ${sourceId}` });

    const embedUrl = source.tvUrl(req.params.id, req.params.season, req.params.episode);
    const result = await extractor.resolve(embedUrl);
    res.json({ ...result, source: sourceId });
  }));

  return router;
}
