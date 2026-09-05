// ── Misc Routes ───────────────────────────────────────────────────────────────
// AniSkip, Episode Mappings, and Blocklist endpoints.

import { Router } from 'express';
import { applyEpisodeGroupMapping } from '../utils/episodeMappings.js';
import { BLOCKED_HOSTS } from '../utils/blocklist.js';

// ── AniSkip Cache (in-memory) ─────────────────────────────────────────────────
const aniSkipCache = new Map();
const ANISKIP_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchAniSkip(malId, episodeNumber) {
  const cacheKey = `${malId}-${episodeNumber}`;
  const cached = aniSkipCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const res = await fetch(
      `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types=op&types=ed`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.found || !data.results) return null;

    const timings = {};
    for (const r of data.results) {
      if (r.skipType === 'op' && r.interval) timings.intro = r.interval;
      if (r.skipType === 'ed' && r.interval) timings.outro = r.interval;
    }

    aniSkipCache.set(cacheKey, { data: timings, expiresAt: Date.now() + ANISKIP_TTL });
    return timings;
  } catch {
    return null;
  }
}

/**
 * @param {{ tmdbFetch: Function }} tmdbClient
 */
export function createMiscRouter(tmdbClient) {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/aniskip/:malId/:episode
  router.get('/aniskip/:malId/:episode', asyncHandler(async (req, res) => {
    const { malId, episode } = req.params;
    const timings = await fetchAniSkip(malId, episode);
    if (!timings) return res.status(404).json({ error: 'No skip times found' });
    res.json(timings);
  }));

  // GET /api/episode-groups/:tmdbId
  // Uses applyEpisodeGroupMapping to find the mapping for the requested season/episode
  router.get('/episode-groups/:tmdbId', asyncHandler(async (req, res) => {
    const { tmdbId } = req.params;
    const { season, episode } = req.query;

    if (!season || !episode) {
      return res.status(400).json({ error: 'season and episode query params required' });
    }

    const s = parseInt(season, 10);
    const e = parseInt(episode, 10);

    const mapping = await applyEpisodeGroupMapping(tmdbId, s, e, tmdbClient);
    if (mapping) {
      res.json(mapping);
    } else {
      res.status(404).json({ error: 'No mapping found' });
    }
  }));

  // GET /api/blocklist — expose the ad/tracker blocklist for frontend use if desired
  router.get('/blocklist', (req, res) => {
    res.json(BLOCKED_HOSTS);
  });

  return router;
}
