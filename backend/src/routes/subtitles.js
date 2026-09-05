// ── Subtitle Routes ───────────────────────────────────────────────────────────
// Search + download (SSRF-guarded)

import { Router } from 'express';
import dns from 'node:dns/promises';
import * as subtitleService from '../services/subtitleService.js';

// ── SSRF Prevention ───────────────────────────────────────────────────────────
// Domain allowlist: every entry traced to actual SubDL/Wyzie CDN endpoints.

const ALLOWED_SUBTITLE_HOSTS = new Set([
  'dl.subdl.com',
  'api.subdl.com',
  'downloads.subdl.com',
  'sub.wyzie.ru',
  'api.opensubtitles.com',
]);

// Private IP ranges — checked after DNS resolution
function isPrivateIP(ip) {
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip === '0.0.0.0') return true;
  // 172.16.0.0 – 172.31.255.255
  const match = ip.match(/^172\.(\d+)\./);
  if (match) {
    const second = parseInt(match[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Validate a subtitle download URL against allowlist and DNS.
 * What this covers: allowlist check + first-pass DNS resolution against private IPs.
 * What this doesn't cover: DNS rebinding (TOCTOU between dns.resolve4 and fetch).
 * See implementation_plan.md for full threat analysis.
 *
 * @param {string} urlStr
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function validateSubtitleUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  // Gate 1: hostname must be in allowlist
  if (!ALLOWED_SUBTITLE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, error: 'Subtitle host not allowed' };
  }

  // Gate 2: protocol must be http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP(S) URLs allowed' };
  }

  // Gate 3: resolve DNS and check for private IPs
  try {
    const addresses = await dns.resolve4(parsed.hostname);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return { ok: false, error: 'Subtitle host resolves to private IP' };
      }
    }
  } catch {
    // DNS failure — allow it (the fetch will fail anyway, and blocking on DNS
    // resolution failure would break legitimate CDN lookups during transient DNS issues)
  }

  return { ok: true };
}

export function createSubtitlesRouter() {
  const router = Router();
  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // GET /api/subtitles/search
  router.get('/search', asyncHandler(async (req, res) => {
    const { tmdbId, type, season, episode, lang } = req.query;
    if (!tmdbId || !type) {
      return res.status(400).json({ error: 'tmdbId and type are required' });
    }

    const languages = lang ? lang.split(',').map((l) => l.trim()).filter(Boolean) : [];
    const results = await subtitleService.searchAll({
      tmdbId: parseInt(tmdbId, 10),
      mediaType: type,
      season: season ? parseInt(season, 10) : undefined,
      episode: episode ? parseInt(episode, 10) : undefined,
      languages,
    });

    res.json({ subtitles: results });
  }));

  // GET /api/subtitles/download?url=... — SSRF-guarded
  router.get('/download', asyncHandler(async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url parameter is required' });

    // Validate URL against allowlist + DNS
    const validation = await validateSubtitleUrl(url);
    if (!validation.ok) {
      return res.status(403).json({ error: validation.error });
    }

    // Fetch the subtitle file
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Subtitle fetch failed: ${response.status}` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Check if it's a ZIP file (PK header)
    if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      const extracted = subtitleService.extractFirstSubtitleFromZip(buffer);
      if (!extracted) {
        return res.status(422).json({ error: 'No subtitle file found in ZIP' });
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Subtitle-Filename', extracted.name);
      res.send(extracted.data);
    } else {
      // Raw subtitle file
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(buffer);
    }
  }));

  return router;
}
