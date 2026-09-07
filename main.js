import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

process.on('uncaughtException', err => {
  try { fs.writeFileSync('d:\\BC1\\fatal.txt', err.stack || err.message); } catch(e){}
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure app data and env are set BEFORE importing server.js
const exeDir = process.env.PORTABLE_EXECUTABLE_DIR 
  ? process.env.PORTABLE_EXECUTABLE_DIR 
  : (app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname);

// Load .env from beside the executable
const envPath = path.join(exeDir, '.env');

let debugInfo = `isPackaged: ${app.isPackaged}\nexeDir: ${exeDir}\nenvPath: ${envPath}\nExists: ${fs.existsSync(envPath)}\n`;

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath, override: true });
  debugInfo += `dotenv result: ${JSON.stringify(result)}\n`;
}

process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');
process.env.DOWNLOADER_PATH = app.isPackaged ? path.join(process.resourcesPath, 'downloader.bat') : path.join(__dirname, 'downloader.bat');

debugInfo += `TMDB_API_KEY: ${process.env.TMDB_API_KEY ? 'Set' : 'Missing'}\n`;
try { fs.writeFileSync('d:\\BC1\\debug.txt', debugInfo); } catch(e){}

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Muffin TV',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required'
    },
    autoHideMenuBar: true,
  });

  // Block popup ads from third-party players inside iframes
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  try {
    const { startServer } = await import('./server.js');
    const { port } = await startServer(0); // Port 0 allows OS to pick an available port
    
    console.log(`Server started on port ${port}, loading UI...`);
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    try { fs.writeFileSync('d:\\BC1\\main_error.log', error.stack || error.message); } catch(e){}
    dialog.showErrorBox('Startup Error', `Failed to start the backend server:\n\n${error.message}`);
    app.quit();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
