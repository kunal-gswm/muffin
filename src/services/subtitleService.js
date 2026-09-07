// ── Subtitle Service ──────────────────────────────────────────────────────────
// Ported from Streambert's src/ipc/subtitles.js
// SubDL + Wyzie search, ZIP extraction with bomb protection.

import zlib from 'node:zlib';
import path from 'node:path';
import config from '../config.js';

const ZIP_MAX_OUTPUT_BYTES = 10 * 1024 * 1024; // 10MB — zip bomb guard
const SUBTITLE_EXTS = new Set(['srt', 'vtt', 'ass', 'ssa']);

// ── ZIP subtitle extractor ────────────────────────────────────────────────────

export function extractFirstSubtitleFromZip(buf) {
  let offset = 0;
  while (offset < buf.length - 30) {
    if (buf[offset] === 0x50 && buf[offset + 1] === 0x4b && buf[offset + 2] === 0x03 && buf[offset + 3] === 0x04) {
      const compression = buf.readUInt16LE(offset + 8);
      const compressedSize = buf.readUInt32LE(offset + 18);
      const fileNameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const rawFileName = buf.slice(offset + 30, offset + 30 + fileNameLen).toString('utf8');
      const dataOffset = offset + 30 + fileNameLen + extraLen;
      const fileName = path.basename(rawFileName);
      const ext = fileName.toLowerCase().split('.').pop();

      if (SUBTITLE_EXTS.has(ext)) {
        const compressedData = buf.slice(dataOffset, dataOffset + compressedSize);
        let data;
        if (compression === 0) {
          if (compressedData.length > ZIP_MAX_OUTPUT_BYTES) { offset = dataOffset + compressedSize; continue; }
          data = compressedData;
        } else if (compression === 8) {
          try {
            data = zlib.inflateRawSync(compressedData, { maxOutputLength: ZIP_MAX_OUTPUT_BYTES });
          } catch { offset = dataOffset + compressedSize; continue; }
        } else {
          offset = dataOffset + compressedSize;
          continue;
        }
        return { data, name: fileName };
      }
      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
}

// ── Subtitle language extraction ──────────────────────────────────────────────

export function extractSubtitleLang(url) {
  try {
    const u = new URL(url);
    for (const param of ['lang', 'language', 'locale', 'sub', 'l']) {
      const v = u.searchParams.get(param);
      if (v && v.length >= 2 && v.length <= 20) return v.toLowerCase();
    }
    const filename = u.pathname.split('/').filter(Boolean).pop() || '';
    const fileMatch = filename.match(/[._-]([a-z]{2,3})[._-]?(vtt|srt|ass)?$/i);
    if (fileMatch) return fileMatch[1].toLowerCase();
    const segments = u.pathname.split('/').filter(Boolean);
    for (const seg of segments.slice(0, -1)) {
      if (/^[a-z]{2,3}(-[A-Z]{2})?$/.test(seg)) return seg.toLowerCase();
    }
  } catch { /* ignore */ }
  return 'unknown';
}

// ── SubDL language conversion ─────────────────────────────────────────────────

function toSubDLLang(lang) {
  if (!lang) return '';
  return lang.split('-')[0].toUpperCase();
}

// ── Search SubDL ──────────────────────────────────────────────────────────────

export async function searchSubDL({ tmdbId, mediaType, season, episode, languages = [] }) {
  if (!config.SUBDL_API_KEY) return [];

  try {
    const params = new URLSearchParams({
      api_key: config.SUBDL_API_KEY,
      tmdb_id: String(tmdbId),
      type: mediaType === 'tv' ? 'tv' : 'movie',
      subs_per_page: '30',
    });

    if (mediaType === 'tv' && season) params.set('season_number', String(season));
    if (mediaType === 'tv' && episode) params.set('episode_number', String(episode));
    if (languages.length > 0) {
      params.set('languages', languages.map(toSubDLLang).filter(Boolean).join(','));
    }

    const res = await fetch(`https://api.subdl.com/api/v1/subtitles?${params}`, {
      headers: { 'User-Agent': 'StreambertBackend/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.subtitles || []).map((s) => ({
      id: s.id || s.release_name,
      name: s.release_name || s.name || 'Unknown',
      lang: s.language || s.lang || 'unknown',
      url: s.url,
      source: 'subdl',
      format: s.format || 'srt',
      downloads: s.download_count || 0,
    }));
  } catch {
    return [];
  }
}

// ── Search Wyzie ──────────────────────────────────────────────────────────────

export async function searchWyzie({ tmdbId, mediaType, season, episode, languages = [] }) {
  if (!config.WYZIE_API_KEY) return [];

  try {
    const params = new URLSearchParams({
      api_key: config.WYZIE_API_KEY,
      tmdb_id: String(tmdbId),
      type: mediaType === 'tv' ? 'tv' : 'movie',
    });

    if (mediaType === 'tv' && season) params.set('season', String(season));
    if (mediaType === 'tv' && episode) params.set('episode', String(episode));
    if (languages.length > 0) params.set('languages', languages.join(','));

    const res = await fetch(`https://sub.wyzie.ru/search?${params}`, {
      headers: { 'User-Agent': 'StreambertBackend/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.subtitles || data || []).map((s) => ({
      id: s.id || s.name,
      name: s.name || s.release_name || 'Unknown',
      lang: s.language || s.lang || 'unknown',
      url: s.url,
      source: 'wyzie',
      format: s.format || 'srt',
      downloads: s.downloads || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Search both subtitle providers and merge results.
 */
export async function searchAll(params) {
  const [subdl, wyzie] = await Promise.allSettled([
    searchSubDL(params),
    searchWyzie(params),
  ]);

  return [
    ...(subdl.status === 'fulfilled' ? subdl.value : []),
    ...(wyzie.status === 'fulfilled' ? wyzie.value : []),
  ];
}
