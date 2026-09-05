// ── Download Manager ──────────────────────────────────────────────────────────
// Ported from Streambert's src/ipc/downloads.js
// Queue + binary spawning + SSE progress via EventEmitter

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { read, write } from '../utils/store.js';
import config from '../config.js';

const DOWNLOADS_FILE = 'downloads.json';

// Active child processes: id → { proc, killTimer }
const activeProcs = new Map();

// Event emitter for SSE progress
export const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(50);

// ── Load/save ─────────────────────────────────────────────────────────────────

function loadDownloads() {
  const raw = read(DOWNLOADS_FILE, []);
  // Deduplicate: newest per (tmdbId, mediaType, season, episode)
  const seen = new Map();
  const sorted = [...raw].sort((a, b) => (b.completedAt || b.startedAt || 0) - (a.completedAt || a.startedAt || 0));
  for (const d of sorted) {
    const key = d.tmdbId && d.mediaType
      ? `${d.tmdbId}|${d.mediaType}|${d.season ?? ''}|${d.episode ?? ''}`
      : d.id;
    if (!seen.has(key)) seen.set(key, d);
  }
  return [...seen.values()];
}

function saveDownloads(downloads) {
  const toSave = downloads.filter((d) => d.status !== 'downloading' && d.status !== 'error');
  write(DOWNLOADS_FILE, toSave);
}

// ── Validate downloader binary ────────────────────────────────────────────────

let validatedBinaryPath = null;

export function validateBinary() {
  if (!config.DOWNLOADER_PATH) return { available: false, reason: 'DOWNLOADER_PATH not set' };
  try {
    const real = fs.realpathSync(config.DOWNLOADER_PATH);
    const stat = fs.statSync(real);
    if (!stat.isFile()) return { available: false, reason: 'DOWNLOADER_PATH is not a file' };
    validatedBinaryPath = real;
    return { available: true, path: real };
  } catch (err) {
    return { available: false, reason: `Cannot access binary: ${err.message}` };
  }
}

// ── Temp file cleanup ─────────────────────────────────────────────────────────

const TEMP_PATTERNS = [/\.part$/, /\.part\.\d+$/, /\.part\.tmp$/, /\.tmp$/, /\.ytdl$/, /\.part-Frag\d+$/];

function cleanupTempFiles(downloadPath) {
  if (!downloadPath) return;
  try {
    const entries = fs.readdirSync(downloadPath);
    for (const entry of entries) {
      if (TEMP_PATTERNS.some((p) => p.test(entry))) {
        try { fs.unlinkSync(path.join(downloadPath, entry)); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getDownloads() {
  return loadDownloads();
}

export function startDownload({ m3u8Url, name, outputDir, tmdbId, mediaType, season, episode, posterPath }) {
  if (!validatedBinaryPath) {
    throw Object.assign(new Error('Download binary not available'), { status: 501 });
  }

  const downloads = loadDownloads();
  const id = randomUUID();
  const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');
  const outPath = path.join(outputDir, `${sanitizedName}.mp4`);

  const download = {
    id,
    name,
    status: 'downloading',
    progress: 0,
    m3u8Url,
    outputPath: outPath,
    downloadPath: outputDir,
    tmdbId,
    mediaType,
    season,
    episode,
    posterPath,
    startedAt: Date.now(),
    completedAt: null,
    lastMessage: '',
  };

  downloads.unshift(download);
  saveDownloads(downloads);

  // Spawn the binary
  const proc = spawn(validatedBinaryPath, [m3u8Url, outPath], {
    cwd: outputDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  activeProcs.set(id, { proc, killTimer: null });

  // Parse progress from stdout
  proc.stdout.on('data', (chunk) => {
    const line = chunk.toString().trim();
    const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      download.progress = parseFloat(percentMatch[1]);
    }
    download.lastMessage = line;
    progressEmitter.emit('progress', { id, progress: download.progress, message: line, status: 'downloading' });
  });

  proc.stderr.on('data', (chunk) => {
    download.lastMessage = chunk.toString().trim();
  });

  proc.on('close', (code) => {
    activeProcs.delete(id);
    if (code === 0) {
      download.status = 'completed';
      download.progress = 100;
      download.completedAt = Date.now();
      progressEmitter.emit('progress', { id, progress: 100, status: 'completed' });
    } else if (download.status !== 'cancelled') {
      download.status = 'error';
      download.lastMessage = `Exited with code ${code}`;
      progressEmitter.emit('progress', { id, progress: download.progress, status: 'error', message: download.lastMessage });
    }
    const all = loadDownloads();
    const idx = all.findIndex((d) => d.id === id);
    if (idx !== -1) all[idx] = download; else all.unshift(download);
    saveDownloads(all);
  });

  return download;
}

export function cancelDownload(id) {
  const entry = activeProcs.get(id);
  if (!entry) {
    // Not actively downloading — just remove from list
    const downloads = loadDownloads();
    const filtered = downloads.filter((d) => d.id !== id);
    saveDownloads(filtered);
    return true;
  }

  const { proc } = entry;
  // SIGTERM first, then SIGKILL after 5s
  try { proc.kill('SIGTERM'); } catch { /* ignore */ }
  const killTimer = setTimeout(() => {
    try { proc.kill('SIGKILL'); } catch { /* ignore */ }
  }, 5000);
  entry.killTimer = killTimer;

  proc.on('close', () => {
    clearTimeout(killTimer);
    activeProcs.delete(id);
    const downloads = loadDownloads();
    const idx = downloads.findIndex((d) => d.id === id);
    if (idx !== -1) {
      downloads[idx].status = 'cancelled';
      downloads[idx].lastMessage = 'Cancelled by user';
      cleanupTempFiles(downloads[idx].downloadPath);
    }
    saveDownloads(downloads);
    progressEmitter.emit('progress', { id, status: 'cancelled' });
  });

  return true;
}

export function deleteDownload(id, deleteFile = false) {
  cancelDownload(id); // cancel if running
  const downloads = loadDownloads();
  const download = downloads.find((d) => d.id === id);
  if (download && deleteFile && download.outputPath) {
    try { fs.unlinkSync(download.outputPath); } catch { /* ignore */ }
  }
  const filtered = downloads.filter((d) => d.id !== id);
  saveDownloads(filtered);
  return true;
}

// ── Shutdown ──────────────────────────────────────────────────────────────────

export function shutdownDownloads() {
  for (const [id, { proc, killTimer }] of activeProcs.entries()) {
    if (killTimer) clearTimeout(killTimer);
    try { proc.kill('SIGTERM'); } catch { /* ignore */ }
    // SIGKILL after 5s
    setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
    }, 5000);
    const downloads = loadDownloads();
    const idx = downloads.findIndex((d) => d.id === id);
    if (idx !== -1) {
      downloads[idx].status = 'cancelled';
      downloads[idx].lastMessage = 'Cancelled on shutdown';
    }
    saveDownloads(downloads);
  }
  const folders = new Set(loadDownloads().map((d) => d.downloadPath).filter(Boolean));
  for (const folder of folders) cleanupTempFiles(folder);
}
