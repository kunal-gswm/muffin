import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

loadEnv();

// ── Validation ───────────────────────
export async function validateConfig() {
  const errors = [];
  const warnings = [];
  const TMDB_API_KEY = (process.env.TMDB_API_KEY || '').trim();
  const SUBDL_API_KEY = (process.env.SUBDL_API_KEY || '').trim();
  const WYZIE_API_KEY = (process.env.WYZIE_API_KEY || '').trim();
  const DOWNLOADER_PATH = (process.env.DOWNLOADER_PATH || '').trim();

  // TMDB_API_KEY is handled via setup mode now, no longer a fatal error
  // if (!TMDB_API_KEY) {
  //   errors.push('TMDB_API_KEY is required. Get one at https://www.themoviedb.org/settings/api');
  // }

  if (!SUBDL_API_KEY) warnings.push('SUBDL_API_KEY not set — SubDL subtitle search disabled');
  if (!WYZIE_API_KEY) warnings.push('WYZIE_API_KEY not set — Wyzie subtitle search disabled');

  if (DOWNLOADER_PATH) {
    try {
      const real = fs.realpathSync(DOWNLOADER_PATH);
      if (real.toLowerCase() !== path.resolve(DOWNLOADER_PATH).toLowerCase()) {
        errors.push(`DOWNLOADER_PATH resolves to "${real}" which doesn't match "${path.resolve(DOWNLOADER_PATH)}". Use the canonical absolute path.`);
      }
    } catch {
      warnings.push(`DOWNLOADER_PATH "${DOWNLOADER_PATH}" does not exist or is not accessible — downloads disabled`);
    }
  } else {
    warnings.push('DOWNLOADER_PATH not set — download feature disabled');
  }

  // Check Puppeteer availability
  let puppeteerAvailable = false;
  try {
    await import('puppeteer');
    puppeteerAvailable = true;
  } catch {
    warnings.push('Puppeteer not installed — stream resolve endpoints will return 501');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    puppeteerAvailable,
  };
}

export default {
  get TMDB_API_KEY() { return (process.env.TMDB_API_KEY || '').trim(); },
  get PORT() { return parseInt(process.env.PORT || '3939', 10); },
  get SUBDL_API_KEY() { return (process.env.SUBDL_API_KEY || '').trim(); },
  get WYZIE_API_KEY() { return (process.env.WYZIE_API_KEY || '').trim(); },
  get ENABLE_ANIME() { return process.env.ENABLE_ANIME !== 'false'; },
  get DOWNLOADER_PATH() { return (process.env.DOWNLOADER_PATH || '').trim(); },
  get PUPPETEER_MAX_PAGES() { return Math.max(1, Math.min(4, parseInt(process.env.PUPPETEER_MAX_PAGES || '2', 10))); },
  get PUPPETEER_MAX_REQUESTS() { return parseInt(process.env.PUPPETEER_MAX_REQUESTS || '50', 10); },
  get PUPPETEER_PAGE_TIMEOUT() { return parseInt(process.env.PUPPETEER_PAGE_TIMEOUT || '30000', 10); },
  get DATA_DIR() { return path.resolve(process.env.DATA_DIR || './data'); },
  get SETUP_REQUIRED() { return !(process.env.TMDB_API_KEY || '').trim(); },
};
