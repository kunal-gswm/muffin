import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';

const dataDir = config.DATA_DIR;

// Ensure data directory exists on first use
let dirCreated = false;
function ensureDir() {
  if (dirCreated) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dirCreated = true;
}

/**
 * Read a JSON file from the data directory.
 * Returns defaultValue on missing or corrupt file — never throws.
 */
export function read(filename, defaultValue = {}) {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Write data as JSON to the data directory.
 * Overwrites the file. Single user, single process — no locking.
 */
export function write(filename, data) {
  ensureDir();
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
