import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

loadEnv();

// ── Required ──────────────────────────────────────────────────────────────────
const TMDB_API_KEY = (process.env.TMDB_API_KEY || '').trim();

// ── Server ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3939', 10);

// ── Optional keys ─────────────────────────────────────────────────────────────
const SUBDL_API_KEY = (process.env.SUBDL_API_KEY || '').trim();
const WYZIE_API_KEY = (process.env.WYZIE_API_KEY || '').trim();

// ── Feature flags ─────────────────────────────────────────────────────────────
const ENABLE_ANIME = process.env.ENABLE_ANIME !== 'false'; // default true

// ── Downloader binary ─────────────────────────────────────────────────────────
// Must be an exact absolute path to the binary. Validated at boot.
const DOWNLOADER_PATH = (process.env.DOWNLOADER_PATH || '').trim();

// ── Puppeteer tuning ──────────────────────────────────────────────────────────
const PUPPETEER_MAX_PAGES = Math.max(1, Math.min(4, parseInt(process.env.PUPPETEER_MAX_PAGES || '2', 10)));
const PUPPETEER_MAX_REQUESTS = parseInt(process.env.PUPPETEER_MAX_REQUESTS || '50', 10);
const PUPPETEER_PAGE_TIMEOUT = parseInt(process.env.PUPPETEER_PAGE_TIMEOUT || '30000', 10);

// ── Data directory ────────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

// ── Validation (called from main(), not at import time) ───────────────────────

/** Validate config. Returns { ok, warnings, errors }. */
export async function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!TMDB_API_KEY) {
    errors.push('TMDB_API_KEY is required. Get one at https://www.themoviedb.org/settings/api');
  }

  if (!SUBDL_API_KEY) warnings.push('SUBDL_API_KEY not set — SubDL subtitle search disabled');
  if (!WYZIE_API_KEY) warnings.push('WYZIE_API_KEY not set — Wyzie subtitle search disabled');

  if (DOWNLOADER_PATH) {
    try {
      const real = fs.realpathSync(DOWNLOADER_PATH);
      if (real !== path.resolve(DOWNLOADER_PATH)) {
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
  TMDB_API_KEY,
  PORT,
  SUBDL_API_KEY,
  WYZIE_API_KEY,
  ENABLE_ANIME,
  DOWNLOADER_PATH,
  PUPPETEER_MAX_PAGES,
  PUPPETEER_MAX_REQUESTS,
  PUPPETEER_PAGE_TIMEOUT,
  DATA_DIR,
};
