// ── Streambert Backend — Standalone REST API ──────────────────────────────────
// Extracted from truelockmc/streambert. Bound to 127.0.0.1. Local-only.

import express from 'express';
import { fileURLToPath } from 'node:url';
import config, { validateConfig } from './src/config.js';

// Route modules
import { createTmdbRouter } from './src/routes/tmdb.js';
import { createSourcesRouter } from './src/routes/sources.js';
import { createAnimeRouter } from './src/routes/anime.js';
import { createSubtitlesRouter } from './src/routes/subtitles.js';
import { createDownloadsRouter } from './src/routes/downloads.js';
import { createLibraryRouter } from './src/routes/library.js';
import { createMiscRouter } from './src/routes/misc.js';
import { createSettingsRouter } from './src/routes/settings.js';

// Services (real implementations)
import { createTmdbClient } from './src/services/tmdbClient.js';

// ── CORS — dev-only, dynamic origin reflection ───────────────────────────────
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && LOOPBACK_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
  }
  next();
}

// ── App Factory — pure, no side effects ───────────────────────────────────────

/**
 * Create the Express app. Accepts optional injected services for testability.
 * Default call builds real services from config.
 *
 * @param {object} [services]
 * @param {object} [services.tmdbClient] — { tmdbFetch, imgUrl }
 * @param {boolean} [services.enableAnime] — override ENABLE_ANIME
 * @param {string} [services.dataDir] — override DATA_DIR for test isolation
 */
export function createApp(services = {}) {
  const app = express();

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json());

  // Services — injected or real
  const tmdbClient = services.tmdbClient || createTmdbClient(config.TMDB_API_KEY);
  const enableAnime = services.enableAnime ?? config.ENABLE_ANIME;

  // Mount routes
  app.use('/api/tmdb', createTmdbRouter(tmdbClient));
  app.use('/api/sources', createSourcesRouter(tmdbClient));
  app.use('/api/anime', createAnimeRouter({ enabled: enableAnime }));
  app.use('/api/subtitles', createSubtitlesRouter());
  app.use('/api/downloads', createDownloadsRouter());
  app.use('/api/library', createLibraryRouter());
  app.use('/api/settings', createSettingsRouter());
  app.use('/api', createMiscRouter(tmdbClient));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
  });

  // Global async error handler
  app.use((err, req, res, _next) => {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// ── Boot Logic — only runs when executed directly ─────────────────────────────

async function main() {
  console.log('[boot] Streambert Backend starting...');

  const validation = await validateConfig();

  // Log status table
  console.log(`[boot] TMDB_API_KEY: ${config.TMDB_API_KEY ? '✓' : '✗'}`);
  console.log(`[boot] SUBDL_API_KEY: ${config.SUBDL_API_KEY ? '✓' : '✗ (subtitle search disabled)'}`);
  console.log(`[boot] WYZIE_API_KEY: ${config.WYZIE_API_KEY ? '✓' : '✗ (subtitle search disabled)'}`);
  console.log(`[boot] DOWNLOADER_PATH: ${config.DOWNLOADER_PATH ? '✓ (' + config.DOWNLOADER_PATH + ')' : '✗ (downloads disabled)'}`);
  console.log(`[boot] Puppeteer: ${validation.puppeteerAvailable ? '✓ (max ' + config.PUPPETEER_MAX_PAGES + ' concurrent pages, restart after ' + config.PUPPETEER_MAX_REQUESTS + ' requests)' : '✗ (resolve endpoints return 501)'}`);
  console.log(`[boot] Anime resolver: ${config.ENABLE_ANIME ? '✓ (enabled)' : '✗ (disabled)'}`);

  // Print warnings
  for (const w of validation.warnings) {
    console.warn(`[boot] ⚠ ${w}`);
  }

  // Exit on fatal errors
  if (!validation.ok) {
    for (const e of validation.errors) {
      console.error(`[boot] ✗ ${e}`);
    }
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.PORT, '127.0.0.1', () => {
    console.log(`[boot] Listening on 127.0.0.1:${config.PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[shutdown] Shutting down...');
    server.close(() => process.exit(0));
    // Force exit after 10s if connections hang
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ── Entrypoint Guard ──────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
// Restart trigger
