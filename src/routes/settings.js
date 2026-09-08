import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import os from 'node:os';

import { scanLocalDirectory } from '../services/localScanner.js';
import { authenticate, logout, getStatus } from '../services/traktClient.js';

export function createSettingsRouter(tmdbClient) {
  const router = Router();
  const envPath = process.env.PORTABLE_EXECUTABLE_DIR 
    ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, '.env') 
    : path.resolve(process.cwd(), '.env');

  // GET /api/settings — read current .env values
  router.get('/', (req, res) => {
    try {
      if (!fs.existsSync(envPath)) {
        return res.json({});
      }
      
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const settings = {};
      
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            settings[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read settings' });
    }
  });

  // POST /api/settings — update .env values
  router.post('/', (req, res) => {
    try {
      const updates = req.body; // { TMDB_API_KEY: '...', DOWNLOADER_PATH: '...' }
      
      let currentSettings = {};
      let lines = [];
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        lines = envContent.split('\n');
      }

      // We will reconstruct the file keeping comments intact where possible
      const updatedLines = [];
      const updatedKeys = new Set();

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key] = trimmed.split('=');
          const cleanKey = key.trim();
          if (updates[cleanKey] !== undefined) {
            updatedLines.push(`${cleanKey}=${updates[cleanKey]}`);
            updatedKeys.add(cleanKey);
            continue;
          }
        }
        updatedLines.push(line);
      }

      // Append new keys that didn't exist in the file
      for (const [key, value] of Object.entries(updates)) {
        if (!updatedKeys.has(key)) {
          // Remove empty trailing lines before appending
          while (updatedLines.length > 0 && updatedLines[updatedLines.length - 1].trim() === '') {
            updatedLines.pop();
          }
          updatedLines.push(`${key}=${value}`);
        }
      }

      fs.writeFileSync(envPath, updatedLines.join('\n'));
      res.json({ success: true, message: 'Settings saved. Please restart the backend server.' });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // POST /api/settings/select-folder — trigger native OS folder dialog
  router.post('/select-folder', (req, res) => {
    try {
      const psScript = `
Add-Type -AssemblyName System.windows.forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
[void]$f.ShowDialog()
$f.SelectedPath
      `.trim();
      
      const tmpPath = path.join(os.tmpdir(), `folder-picker-${Date.now()}.ps1`);
      fs.writeFileSync(tmpPath, psScript);

      exec(`powershell -ExecutionPolicy Bypass -File "${tmpPath}"`, (error, stdout) => {
        // Cleanup temp script
        try { fs.unlinkSync(tmpPath); } catch (e) {}

        if (error) {
          return res.status(500).json({ error: 'Dialog execution failed' });
        }
        
        const selectedPath = stdout.trim();
        if (selectedPath) {
          res.json({ path: selectedPath });
        } else {
          // User clicked cancel
          res.json({ path: null });
        }
      });
    } catch (err) {
      console.error('Folder picker error:', err);
      res.status(500).json({ error: 'Failed to open folder picker' });
    }
  });

  // POST /api/settings/scan-local — scan local directory for media
  router.post('/scan-local', async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      if (!dirPath) return res.status(400).json({ error: 'path is required' });
      
      const results = await scanLocalDirectory(dirPath, tmdbClient);
      res.json(results);
    } catch (err) {
      console.error('Scanner error:', err);
      res.status(500).json({ error: 'Scan failed' });
    }
  });

  // GET /api/settings/trakt - get auth status
  router.get('/trakt', (req, res) => {
    res.json(getStatus());
  });

  // POST /api/settings/trakt/login
  router.post('/trakt/login', (req, res) => {
    authenticate('mock_token_' + Date.now());
    res.json(getStatus());
  });

  // POST /api/settings/trakt/logout
  router.post('/trakt/logout', (req, res) => {
    logout();
    res.json(getStatus());
  });

  return router;
}
