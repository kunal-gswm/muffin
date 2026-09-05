// ── Stream Extractor — Puppeteer-based .m3u8 resolution ───────────────────────
// Replaces Electron's BrowserView + session.webRequest.onBeforeRequest interception.
// Launches headless Chromium, navigates to embed URL, intercepts .m3u8 and .vtt URLs.

import config from '../config.js';
import { isBlocked } from '../utils/blocklist.js';

let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch {
  // Puppeteer not installed — module exports will be no-ops
  puppeteer = null;
}

// ── Browser Pool (singleton) ──────────────────────────────────────────────────

let browser = null;
let totalRequests = 0;
let activePagesCount = 0;
let launching = null; // promise while browser is starting

const MAX_PAGES = config.PUPPETEER_MAX_PAGES;          // hard cap: 2
const MAX_REQUESTS = config.PUPPETEER_MAX_REQUESTS;    // restart after 50
const PAGE_TIMEOUT = config.PUPPETEER_PAGE_TIMEOUT;    // 30s per page
const MAX_QUEUED = 10;                                  // backpressure limit

// ── Job Queue (FIFO with backpressure) ────────────────────────────────────────

const queue = []; // { resolve, reject, embedUrl }

function processQueue() {
  while (queue.length > 0 && activePagesCount < MAX_PAGES) {
    const job = queue.shift();
    _executeJob(job);
  }
}

// ── Browser Lifecycle ─────────────────────────────────────────────────────────

async function ensureBrowser() {
  if (browser && browser.isConnected()) return browser;

  // If another call is already launching, wait for it
  if (launching) {
    await launching;
    if (browser && browser.isConnected()) return browser;
  }

  launching = (async () => {
    try {
      if (browser) {
        try { await browser.close(); } catch { /* ignore */ }
      }
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--no-first-run',
        ],
      });
      totalRequests = 0;

      // Crash recovery
      browser.on('disconnected', () => {
        console.warn('[puppeteer] Browser disconnected — will restart on next request');
        browser = null;
        totalRequests = 0;
      });
    } finally {
      launching = null;
    }
  })();

  await launching;
  return browser;
}

async function restartBrowserIfNeeded() {
  if (totalRequests >= MAX_REQUESTS) {
    console.log(`[puppeteer] Request limit (${MAX_REQUESTS}) reached — restarting browser`);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    browser = null;
    totalRequests = 0;
  }
}

// ── Subtitle language extraction (from URL) ───────────────────────────────────
function extractSubtitleLang(url) {
  try {
    const u = new URL(url);
    for (const param of ['lang', 'language', 'locale', 'sub', 'l']) {
      const v = u.searchParams.get(param);
      if (v && v.length >= 2 && v.length <= 20) return v.toLowerCase();
    }
    const filename = u.pathname.split('/').filter(Boolean).pop() || '';
    const fileMatch = filename.match(/[._-]([a-z]{2,3})[._-]?(vtt|srt|ass)?$/i);
    if (fileMatch) return fileMatch[1].toLowerCase();
  } catch { /* ignore */ }
  return 'unknown';
}

// ── Execute a single resolve job ──────────────────────────────────────────────

async function _executeJob(job) {
  activePagesCount++;
  const startTime = Date.now();
  let page = null;

  try {
    const b = await ensureBrowser();
    if (!b) throw new Error('Browser unavailable');

    page = await b.newPage();
    totalRequests++;

    // Set viewport + user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Request interception — block ads, capture .m3u8 and .vtt
    let foundM3u8 = null;
    const foundSubs = [];

    await page.setRequestInterception(true);

    page.on('request', (req) => {
      const url = req.url();
      if (isBlocked(url)) {
        req.abort().catch(() => {});
        return;
      }
      // Block heavy resources to speed up page load
      const type = req.resourceType();
      if (['image', 'font', 'stylesheet'].includes(type)) {
        req.abort().catch(() => {});
        return;
      }
      req.continue().catch(() => {});
    });

    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('.m3u8') && !foundM3u8) {
        foundM3u8 = url;
      }
      if (url.includes('.vtt')) {
        foundSubs.push({ url, lang: extractSubtitleLang(url) });
      }
    });

    // Navigate and wait for .m3u8 (with timeout)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), PAGE_TIMEOUT)
    );

    const navigationPromise = (async () => {
      await page.goto(job.embedUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

      // Wait a moment for DOM to settle
      await new Promise(r => setTimeout(r, 2000));

      // Simulate human clicks in the exact center of the player to trigger playback
      // and dismiss any initial overlay ad / play button.
      try {
        await page.mouse.click(1280 / 2, 720 / 2);
        await new Promise(r => setTimeout(r, 1500));
        await page.mouse.click(1280 / 2, 720 / 2);
      } catch (e) {
        // ignore click errors
      }

      // Poll for .m3u8 URL — embeds load streams asynchronously
      const pollInterval = 500;
      const maxWait = PAGE_TIMEOUT - 5000; // leave 5s buffer
      let waited = 0;
      while (!foundM3u8 && waited < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));
        waited += pollInterval;
      }
    })();

    try {
      await Promise.race([navigationPromise, timeoutPromise]);
    } catch (err) {
      if (err.message !== 'timeout') throw err;
    }

    job.resolve({
      m3u8Url: foundM3u8,
      subtitles: foundSubs,
      elapsed: Date.now() - startTime,
    });
  } catch (err) {
    job.resolve({
      m3u8Url: null,
      subtitles: [],
      elapsed: Date.now() - startTime,
      error: err.message,
    });
  } finally {
    if (page) {
      try { await page.close(); } catch { /* ignore */ }
    }
    activePagesCount--;
    await restartBrowserIfNeeded();
    processQueue();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve an embed URL to a .m3u8 stream URL via headless Chromium.
 * Queued with hard concurrency cap. Returns 503 if queue is full.
 *
 * @param {string} embedUrl
 * @returns {Promise<{ m3u8Url: string|null, subtitles: Array, elapsed: number }>}
 */
export function resolve(embedUrl) {
  if (!puppeteer) {
    return Promise.reject(new Error('Puppeteer not installed'));
  }

  if (queue.length >= MAX_QUEUED) {
    const err = new Error('Stream resolver queue full — try again later');
    err.status = 503;
    return Promise.reject(err);
  }

  return new Promise((resolve, reject) => {
    const job = { resolve, reject, embedUrl };

    if (activePagesCount < MAX_PAGES) {
      _executeJob(job);
    } else {
      queue.push(job);
    }
  });
}

/**
 * Shut down the browser pool. Called on server shutdown.
 */
export async function shutdown() {
  if (browser) {
    try { await browser.close(); } catch { /* ignore */ }
    browser = null;
  }
}
