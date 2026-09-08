// ── TMDB API Client ───────────────────────────────────────────────────────────
// Ported from Streambert's src/utils/api.js
// In-memory cache (Map, 5-min TTL, evict at 80 entries)
// Semaphore: max 4 concurrent TMDB fetches

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE = 80;
const MAX_INFLIGHT = 4;

/**
 * Create a TMDB client instance.
 * @param {string} apiKey — TMDB Read Access Token (Bearer token)
 */
export function createTmdbClient(apiKey) {
  const cache = new Map(); // key → { data, expiresAt }
  let inflight = 0;
  const waiters = [];

  function acquireSlot() {
    if (inflight < MAX_INFLIGHT) {
      inflight++;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiters.push(resolve));
  }

  function releaseSlot() {
    inflight--;
    if (waiters.length > 0) {
      inflight++;
      waiters.shift()();
    }
  }

  const deduplicator = new Map(); // key -> Promise

  /**
   * Fetch from TMDB API with caching, deduplication, and concurrency control.
   * @param {string} path — e.g. '/movie/27205' or '/trending/movie/week'
   * @param {string} [language='en-US']
   * @returns {Promise<object>} — raw TMDB JSON
   */
  async function tmdbFetch(path, language = 'en-US') {
    const sep = path.includes('?') ? '&' : '?';
    const localizedPath = `${path}${sep}language=${language}`;
    const cacheKey = localizedPath;

    // Cache hit
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached) {
      if (now < cached.staleAt) {
        // Fresh hit
        return cached.data;
      } else if (now < cached.expiresAt) {
        // Stale hit: return immediately, refresh in background if not already fetching
        if (!deduplicator.has(cacheKey)) {
          deduplicator.set(cacheKey, doFetch(localizedPath, cacheKey).finally(() => deduplicator.delete(cacheKey)));
        }
        return cached.data; // return stale
      }
    }

    // Cache miss or fully expired
    // Deduplication: if someone else is already fetching this exact URL, await their promise!
    if (deduplicator.has(cacheKey)) {
      return deduplicator.get(cacheKey);
    }

    const fetchPromise = doFetch(localizedPath, cacheKey);
    deduplicator.set(cacheKey, fetchPromise);
    
    try {
      return await fetchPromise;
    } finally {
      deduplicator.delete(cacheKey);
    }
  }

  async function doFetch(localizedPath, cacheKey) {
    await acquireSlot();

    let res;
    let retries = 3;
    while (retries > 0) {
      try {
        res = await fetch(`${TMDB_BASE}${localizedPath}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          keepalive: false
        });
        break; // success
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error('[TMDB Fetch Error]', err);
          releaseSlot();
          throw new Error('TMDB unreachable');
        }
        await new Promise(r => setTimeout(r, 250));
      }
    }

    releaseSlot();

    if (res.status === 401 || res.status === 403) {
      const error = new Error(`TMDB auth error (${res.status})`);
      error.status = res.status;
      throw error;
    }

    if (!res.ok) {
      const error = new Error(`TMDB ${res.status}`);
      error.status = res.status;
      throw error;
    }

    const data = await res.json();

    // Dynamic TTL: Search gets 10m stale / 30m expire. Others get 30m stale / 2h expire.
    const isDynamic = localizedPath.includes('/search/') || localizedPath.includes('/discover/');
    const staleTime = isDynamic ? 10 * 60 * 1000 : 30 * 60 * 1000;
    const expireTime = isDynamic ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;

    const now = Date.now();
    cache.set(cacheKey, { 
      data, 
      staleAt: now + staleTime,
      expiresAt: now + expireTime 
    });

    // Evict completely stale entries when cache grows too large
    if (cache.size > MAX_CACHE) {
      for (const [k, v] of cache) {
        if (now >= v.expiresAt) cache.delete(k);
      }
    }

    return data;
  }

  /**
   * Build a TMDB image CDN URL.
   * @param {string|null} path — e.g. '/abc123.jpg'
   * @param {string} [size='w500']
   * @returns {string|null}
   */
  function imgUrl(path, size = 'w500') {
    return path ? `${IMG_BASE}/${size}${path}` : null;
  }

  /** Clear the in-memory cache. */
  function clearCache() {
    cache.clear();
  }

  return { tmdbFetch, imgUrl, clearCache };
}
