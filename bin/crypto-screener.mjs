#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createGzip } from 'node:zlib';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(os.homedir(), '.crypto-screener');
const PID_FILE = path.join(DATA_DIR, 'pid');
const LOG_FILE = path.join(DATA_DIR, 'server.log');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DEFAULT_PORT = 9212;

// ─── Helpers ────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { port: DEFAULT_PORT, projectPath: null };
  }
}

function saveConfig(config) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function resolvePort(args) {
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) return parseInt(args[portIdx + 1], 10);
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  const config = loadConfig();
  return config.port || DEFAULT_PORT;
}

function getProjectPath() {
  const config = loadConfig();
  let projectPath = config.projectPath;

  if (projectPath && fs.existsSync(path.join(projectPath, 'package.json'))) {
    return projectPath;
  }

  if (projectPath && !fs.existsSync(projectPath)) {
    console.log(`⚠️  Project directory not found: ${projectPath}`);
  }

  // Try cwd
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'package.json'))) {
    config.projectPath = cwd;
    saveConfig(config);
    return cwd;
  }

  console.error('❌ No project directory found. Run from the project root.');
  process.exit(1);
}

function isRunning() {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return pid;
  } catch {
    try { fs.unlinkSync(PID_FILE); } catch {}
    return null;
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function readVersion(projectPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch { return '0.0.0'; }
}

function runShell(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

// ─── Static File Server ─────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.map':  'application/json',
};

const GZIP_TYPES = new Set(['.html', '.js', '.css', '.json', '.svg', '.map']);

function startServer() {
  const config = loadConfig();
  const port = resolvePort(process.argv);
  const projectPath = config.projectPath;
  const distDir = path.join(projectPath, 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Run build first.');
    process.exit(1);
  }

  const indexHtml = path.join(distDir, 'index.html');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let filePath = path.join(distDir, url.pathname === '/' ? 'index.html' : url.pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check if file exists, SPA fallback
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = indexHtml;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache: hashed assets get long cache, index.html gets no-cache
    const isHashed = /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
    const cacheControl = (ext === '.html' || !isHashed)
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';

    const acceptEncoding = req.headers['accept-encoding'] || '';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);

    const raw = fs.createReadStream(filePath);

    if (acceptEncoding.includes('gzip') && GZIP_TYPES.has(ext)) {
      res.setHeader('Content-Encoding', 'gzip');
      res.writeHead(200);
      raw.pipe(createGzip()).pipe(res);
    } else {
      res.writeHead(200);
      raw.pipe(res);
    }

    raw.on('error', () => {
      res.writeHead(404);
      res.end('Not Found');
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  });

  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      process.exit(1);
    }
    throw err;
  });
}

// ─── Commands ───────────────────────────────────────────────

async function cmdStart() {
  ensureDataDir();

  const pid = isRunning();
  if (pid) {
    const config = loadConfig();
    console.log(`⚡ Already running on http://localhost:${config.port} (PID: ${pid})`);
    process.exit(0);
  }

  const projectPath = getProjectPath();
  const port = resolvePort(process.argv);

  // Save config
  saveConfig({ port, projectPath });

  // Build
  console.log('🔨 Building...');
  try {
    runShell('npm run build', { cwd: projectPath });
  } catch {
    console.error('❌ Build failed');
    process.exit(1);
  }
  console.log('✅ Build complete');

  // Truncate log file
  fs.writeFileSync(LOG_FILE, '');

  // Spawn server in background
  const logFd = fs.openSync(LOG_FILE, 'a');
  const child = spawn('node', [__filename, '--internal-serve', '--port', String(port)], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    cwd: projectPath,
  });

  // Write PID
  fs.writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  fs.closeSync(logFd);

  console.log(`🚀 Server started on http://localhost:${port} (PID: ${child.pid})`);
}

function cmdStop() {
  const pid = isRunning();
  if (!pid) {
    console.log('ℹ️  Server is not running');
    return false;
  }

  process.kill(pid, 'SIGTERM');

  // Wait for exit (up to 5s)
  const start = Date.now();
  while (Date.now() - start < 5000) {
    try {
      process.kill(pid, 0);
      execSync('sleep 0.2');
    } catch {
      try { fs.unlinkSync(PID_FILE); } catch {}
      console.log(`🛑 Server stopped (PID: ${pid})`);
      return true;
    }
  }

  // Force kill
  try { process.kill(pid, 'SIGKILL'); } catch {}
  try { fs.unlinkSync(PID_FILE); } catch {}
  console.log(`🛑 Server force-stopped (PID: ${pid})`);
  return true;
}

function cmdStatus() {
  const pid = isRunning();
  if (!pid) {
    console.log('🔴 Server is not running');
    return;
  }

  const config = loadConfig();
  let uptime = '';
  try {
    const mtime = fs.statSync(PID_FILE).mtimeMs;
    uptime = formatUptime(Date.now() - mtime);
  } catch {}

  console.log(`🟢 Running on http://localhost:${config.port} (PID: ${pid}, uptime: ${uptime})`);
}

function cmdLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('ℹ️  No log file found. Start the server first.');
    return;
  }

  // Read last 50 lines
  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = content.split('\n');
  const last50 = lines.slice(-51, -1);
  if (last50.length > 0) {
    console.log(last50.join('\n'));
  }

  console.log('\n📋 Tailing log... (Ctrl+C to exit)\n');

  // Follow new content
  let fileSize = fs.statSync(LOG_FILE).size;
  fs.watchFile(LOG_FILE, { interval: 500 }, () => {
    try {
      const newSize = fs.statSync(LOG_FILE).size;
      if (newSize > fileSize) {
        const stream = fs.createReadStream(LOG_FILE, { start: fileSize, encoding: 'utf-8' });
        stream.on('data', (chunk) => process.stdout.write(chunk));
        fileSize = newSize;
      }
    } catch {}
  });

  process.on('SIGINT', () => {
    fs.unwatchFile(LOG_FILE);
    process.exit(0);
  });
}

async function cmdUpdate() {
  const projectPath = getProjectPath();
  const oldVersion = readVersion(projectPath);
  const wasRunning = isRunning();

  // Git pull (if git repo)
  const gitDir = path.join(projectPath, '.git');
  if (fs.existsSync(gitDir)) {
    console.log('📦 Pulling latest changes...');
    try {
      runShell('git pull', { cwd: projectPath });
    } catch {
      console.log('⚠️  Git pull failed, continuing with rebuild...');
    }
  } else {
    console.log('⚠️  No git repository found, skipping pull');
  }

  // npm install
  console.log('📦 Installing dependencies...');
  try {
    runShell('npm install', { cwd: projectPath });
  } catch {
    console.error('❌ npm install failed');
    process.exit(1);
  }

  // Build
  console.log('🔨 Building...');
  try {
    runShell('npm run build', { cwd: projectPath });
  } catch {
    console.error('❌ Build failed');
    process.exit(1);
  }

  const newVersion = readVersion(projectPath);

  if (oldVersion !== newVersion) {
    console.log(`✅ Updated: v${oldVersion} → v${newVersion}`);
  } else {
    console.log(`✅ Rebuilt v${newVersion}`);
  }

  // Restart if was running
  if (wasRunning) {
    cmdStop();
    await cmdStart();
  }
}

function cmdVersion() {
  const projectPath = getProjectPath();
  console.log(`crypto-screener v${readVersion(projectPath)}`);
}

function cmdHelp() {
  console.log(`
  crypto-screener — Background server for Crypto Screener

  Usage:
    crypto-screener <command> [options]

  Commands:
    start [--port N]   Build and start server (default port: 9212)
    stop               Stop the running server
    restart            Restart the server (stop + start)
    status             Show server status
    update             Pull, install, rebuild, and restart
    logs               Tail server log output

  Options:
    --port <number>    Override server port
    --version          Show version
    --help             Show this help
  `.trim());
}

// ─── Main Entry ─────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--internal-serve')) {
  startServer();
} else {
  const command = args[0];

  switch (command) {
    case 'start':
      await cmdStart();
      break;
    case 'stop':
      cmdStop();
      break;
    case 'restart':
      cmdStop();
      await cmdStart();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'update':
      await cmdUpdate();
      break;
    case 'logs':
    case 'log':
      cmdLogs();
      break;
    case '--version':
    case '-v':
      cmdVersion();
      break;
    case '--help':
    case '-h':
    case undefined:
      cmdHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      cmdHelp();
      break;
  }
}
