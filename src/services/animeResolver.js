// ── AllAnime Episode Resolver ─────────────────────────────────────────────────
// Ported from Streambert's src/ipc/allmanga.js
// AllAnime GQL API + hex cipher decoder + AES-256-CTR decryption
// Feature-flagged — every function returns null on failure, never throws into caller.

import https from 'node:https';
import http from 'node:http';
import crypto from 'node:crypto';

// ── AllAnime hex cipher (from ani-cli) ────────────────────────────────────────

const ALLANIME_HEX_MAP = {
  '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G',
  '70': 'H', '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N', '77': 'O',
  '68': 'P', '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U', '6e': 'V', '6f': 'W',
  '60': 'X', '61': 'Y', '62': 'Z',
  '59': 'a', '5a': 'b', '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g',
  '50': 'h', '51': 'i', '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o',
  '48': 'p', '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w',
  '40': 'x', '41': 'y', '42': 'z',
  '08': '0', '09': '1', '0a': '2', '0b': '3', '0c': '4', '0d': '5', '0e': '6', '0f': '7',
  '00': '8', '01': '9',
  '15': '-', '16': '.', '67': '_', '46': '~',
  '02': ':', '17': '/', '07': '?', '1b': '#',
  '63': '[', '65': ']', '78': '@', '19': '!',
  '1c': '$', '1e': '&', '10': '(', '11': ')', '12': '*', '13': '+', '14': ',',
  '03': ';', '05': '=', '1d': '%',
};

export function decodeAllanimeUrl(encoded) {
  try {
    if (encoded.startsWith('--')) encoded = encoded.slice(2);
    let result = '';
    for (let i = 0; i < encoded.length; i += 2) {
      const pair = encoded.slice(i, i + 2);
      result += ALLANIME_HEX_MAP[pair] !== undefined ? ALLANIME_HEX_MAP[pair] : pair;
    }
    return result.replace(/\\u002F/gi, '/').replace(/\\\|/g, '');
  } catch {
    return null;
  }
}

// ── AES-256-CTR decryption for "tobeparsed" encrypted responses ───────────────

const ALLANIME_KEY = crypto.createHash('sha256').update('Xot36i3lK3:v1').digest();

export function decodeTobeparsed(blob) {
  try {
    const buf = Buffer.from(blob, 'base64');
    const iv12 = buf.slice(1, 13);
    const iv16 = Buffer.concat([iv12, Buffer.from([0, 0, 0, 2])]);
    const ct = buf.slice(13, buf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-ctr', ALLANIME_KEY, iv16);
    decipher.setAutoPadding(false);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');

    const sources = [];
    for (const chunk of plain.split(/[{}]/)) {
      const urlMatch = chunk.match(/"sourceUrl"\s*:\s*"(--[^"]+)"/);
      const nameMatch = chunk.match(/"sourceName"\s*:\s*"([^"]+)"/);
      const prioMatch = chunk.match(/"priority"\s*:\s*([0-9.]+)/);
      if (urlMatch) {
        sources.push({
          sourceUrl: urlMatch[1],
          sourceName: nameMatch ? nameMatch[1] : '',
          priority: prioMatch ? parseFloat(prioMatch[1]) : 0,
        });
      }
    }
    return sources;
  } catch {
    return [];
  }
}

export function parseEpisodeSourceUrls(body) {
  try {
    const tbMatch = body.match(/"tobeparsed"\s*:\s*"([^"]+)"/);
    if (tbMatch) {
      const sources = decodeTobeparsed(tbMatch[1]);
      if (sources.length) return sources;
    }
    const sourceUrls = JSON.parse(body)?.data?.episode?.sourceUrls;
    return sourceUrls?.length ? sourceUrls : null;
  } catch {
    return null;
  }
}

// ── HTTPS helpers ─────────────────────────────────────────────────────────────

export function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    function doGet(url) {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            Referer: 'https://allmanga.to',
            Origin: 'https://allmanga.to',
            Accept: '*/*',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            res.resume();
            doGet(loc);
            return;
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }
      );
      req.on('error', reject);
      req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    }
    doGet(urlStr);
  });
}

export function followRedirects(urlStr, maxHops = 10) {
  return new Promise((resolve, reject) => {
    let hops = 0;
    function step(url) {
      if (++hops > maxHops) return resolve(url);
      let u;
      try { u = new URL(url); } catch { return reject(new Error('invalid url: ' + url)); }
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            Referer: 'https://allmanga.to',
            Accept: '*/*',
          },
        },
        (res) => {
          res.resume();
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            step(loc);
          } else {
            resolve(url);
          }
        }
      );
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    }
    step(urlStr);
  });
}

// ── AllAnime GraphQL ──────────────────────────────────────────────────────────

export function allanimeGQL(variables, query) {
  const body = JSON.stringify({ variables, query });
  return new Promise((resolve, reject) => {
    const u = new URL('https://api.allanime.day/api');
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
          Referer: 'https://allmanga.to',
          Origin: 'https://allmanga.to',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Title normalization ───────────────────────────────────────────────────────

export function sanitizeTitle(t) {
  return t
    .replace(/[''`´]/g, "'")
    .replace(/[""„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\w\s'-]/g, '')
    .trim()
    .toLowerCase();
}

// ── High-level resolver ───────────────────────────────────────────────────────

/**
 * Search AllAnime for a show by title.
 * @param {string} query
 * @returns {Promise<object[]|null>}
 */
export async function searchAnime(query) {
  try {
    const gqlQuery = `query($search: SearchInput, $limit: Int, $page: Int) {
      shows(search: $search, limit: $limit, page: $page) {
        edges {
          _id
          name
          englishName
        }
      }
    }`;
    const variables = {
      search: { allowAdult: false, allowUnknown: false, query },
      limit: 20,
      page: 1
    };
    const { body } = await allanimeGQL(variables, gqlQuery);
    const parsed = JSON.parse(body);
    return parsed?.data?.shows?.edges || [];
  } catch {
    return null;
  }
}

/**
 * Get episode list for an AllAnime show.
 * @param {string} allanimeId
 * @returns {Promise<object|null>}
 */
export async function getEpisodes(allanimeId) {
  try {
    const gqlQuery = `query($showId: String!) {
      show(_id: $showId) {
        _id
        name
        englishName
        availableEpisodesDetail
      }
    }`;
    const { body } = await allanimeGQL({ showId: allanimeId }, gqlQuery);
    const parsed = JSON.parse(body);
    return parsed?.data?.show || null;
  } catch {
    return null;
  }
}

/**
 * Resolve an episode to direct stream URLs.
 * @param {string} allanimeId
 * @param {string|number} episodeNum
 * @param {string} [translationType='sub']
 * @returns {Promise<object[]>}
 */
export async function resolveEpisode(allanimeId, episodeNum, translationType = 'sub') {
  try {
    const gqlQuery = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
      episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
        sourceUrls
      }
    }`;
    const variables = {
      showId: allanimeId,
      translationType,
      episodeString: String(episodeNum),
    };
    const { body } = await allanimeGQL(variables, gqlQuery);
    const sourceUrls = parseEpisodeSourceUrls(body);
    if (!sourceUrls) return [];

    // Decode each source URL and resolve redirects
    const resolved = [];
    for (const src of sourceUrls) {
      const decoded = src.sourceUrl?.startsWith('--') ? decodeAllanimeUrl(src.sourceUrl) : src.sourceUrl;
      if (!decoded) continue;

      // Skip known-broken sources
      if (decoded.includes('youtube.com') || decoded.includes('youtu.be')) continue;

      let finalUrl = decoded;
      try {
        // Follow redirects for CDN URLs
        if (decoded.includes('clock') || decoded.includes('fast4speed')) {
          const clockRes = await httpsGet(decoded);
          const links = JSON.parse(clockRes.body)?.links;
          if (links?.length) {
            finalUrl = await followRedirects(links[0].link);
          } else {
            continue;
          }
        }
      } catch {
        continue;
      }

      resolved.push({
        url: finalUrl,
        sourceName: src.sourceName || '',
        priority: src.priority || 0,
      });
    }

    // Sort by priority descending
    resolved.sort((a, b) => b.priority - a.priority);
    return resolved;
  } catch {
    return [];
  }
}
