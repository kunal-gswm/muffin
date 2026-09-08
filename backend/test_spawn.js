import { spawn } from 'child_process';

const m3u8Url = 'https://moon.peakstorm.top/vd/Q1R0bVJRNDZpRzV6RlRDOG9VR095UTpIVFRhV2VZRWNMNzh3MDVIc1VLbGl3T2xvSUtMSkw1MzFqOE9uVnFYelZz/index-s2160p-v1-a1.m3u8';
const validatedBinaryPath = 'd:\\BC1\\N_m3u8DL-RE\\N_m3u8DL-RE_Beta_win-x64\\N_m3u8DL-RE.exe';
const outputDir = 'D:\\Movies';
const sanitizedName = 'The Runner';

const proc = spawn(validatedBinaryPath, [
  m3u8Url, 
  '--save-dir', outputDir, 
  '--save-name', sanitizedName,
  '--auto-select'
], {
  cwd: outputDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false
});

proc.stdout.on('data', (chunk) => {
  console.log('[STDOUT]', chunk.toString());
});

proc.stderr.on('data', (chunk) => {
  console.error('[STDERR]', chunk.toString());
});

proc.on('close', (code) => {
  console.log('[CLOSE] code', code);
});
