# CLI Background Server Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `crypto-screener` CLI that manages the app as a background process with start/stop/restart/status/update/logs commands.

**Architecture:** Single `bin/crypto-screener.mjs` Node.js script using only built-in modules (`node:http`, `node:fs`, `node:path`, `node:zlib`, `node:child_process`, `node:url`). Two modes: CLI mode (default) and server mode (`--internal-serve`). Runtime data stored in `~/.crypto-screener/`.

**Tech Stack:** Node.js built-ins only, zero new dependencies

**Spec:** `docs/superpowers/specs/2026-03-14-cli-background-server-design.md`

---

## Chunk 1: Core CLI Scaffold + Static Server + Start/Stop

### Task 1: Create `bin/crypto-screener.mjs` with helpers and command router

**Files:**
- Create: `bin/crypto-screener.mjs`

- [ ] **Step 1: Create bin directory and scaffold file**

Create `bin/crypto-screener.mjs` with:
- Shebang `#!/usr/bin/env node`
- Imports: `node:fs`, `node:path`, `node:http`, `node:zlib`, `node:child_process`, `node:url`, `node:os`
- Constants: `DATA_DIR = path.join(os.homedir(), '.crypto-screener')`, `PID_FILE`, `LOG_FILE`, `CONFIG_FILE`, `DEFAULT_PORT = 9212`
- Helper: `ensureDataDir()` — creates `~/.crypto-screener/` if missing
- Helper: `loadConfig()` — reads config.json, returns `{ port, projectPath }` with defaults
- Helper: `saveConfig(config)` — writes config.json
- Helper: `resolvePort(args)` — priority: `--port` flag > `PORT` env > config.json > 9212
- Helper: `getProjectPath()` — from config or cwd, validates `package.json` exists
- Helper: `isRunning()` — reads PID file, checks `process.kill(pid, 0)`, cleans stale PID
- Helper: `formatUptime(ms)` — returns human-readable "2h 15m" string
- Helper: `readVersion(projectPath)` — reads version from package.json
- Command router: parse `process.argv[2]` to dispatch `start`, `stop`, `restart`, `status`, `update`, `logs`, `--version`, `--help`
- `--internal-serve` detection: if present, call `startServer()` instead of CLI router

```javascript
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

// --- Helpers ---

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
    process.kill(pid, 0); // test if alive
    return pid;
  } catch {
    // Clean stale PID file
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
```

- [ ] **Step 2: Mark executable**

```bash
chmod +x bin/crypto-screener.mjs
```

- [ ] **Step 3: Verify scaffold runs**

```bash
node bin/crypto-screener.mjs --help
```

Expected: prints help text (or "Unknown command" placeholder until we wire it up).

---

### Task 2: Implement the static file server (`--internal-serve` mode)

**Files:**
- Modify: `bin/crypto-screener.mjs`

- [ ] **Step 1: Add MIME type map and static server function**

Add after helpers section:

```javascript
// --- Static File Server ---

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

    // Cache headers: hashed assets get long cache, index.html gets no-cache
    const isHashed = /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
    const cacheControl = (ext === '.html' || !isHashed)
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const raw = fs.createReadStream(filePath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);

    if (acceptEncoding.includes('gzip') && ['.html', '.js', '.css', '.json', '.svg', '.map'].includes(ext)) {
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
```

- [ ] **Step 2: Add `--internal-serve` detection at bottom of file**

```javascript
// --- Main Entry ---

const args = process.argv.slice(2);

if (args.includes('--internal-serve')) {
  startServer();
} else {
  // CLI router (Task 3)
  const command = args[0];
  // ... will be added in next task
}
```

- [ ] **Step 3: Manual test — build and serve directly**

```bash
cd /Users/kergrit.r/Desktop/claude/crypto-screener
npm run build
node bin/crypto-screener.mjs --internal-serve
# Open http://localhost:9212 in browser — should see the app
# Ctrl+C to stop
```

---

### Task 3: Implement `start` and `stop` commands

**Files:**
- Modify: `bin/crypto-screener.mjs`

- [ ] **Step 1: Add `cmdStart` function**

```javascript
// --- Commands ---

function runShell(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

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
```

- [ ] **Step 2: Add `cmdStop` function**

```javascript
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
      // Still alive, wait
      execSync('sleep 0.2');
    } catch {
      // Process is dead
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
```

- [ ] **Step 3: Wire up command router**

Replace the CLI router placeholder:

```javascript
// --- Main Entry ---

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
    default:
      console.log(`Unknown command: ${command || '(none)'}`);
      console.log('Usage: crypto-screener <start|stop|restart|status|update|logs>');
      break;
  }
}
```

- [ ] **Step 4: Manual test — start and stop**

```bash
node bin/crypto-screener.mjs start
# Expected: 🔨 Building... ✅ Build complete 🚀 Server started on http://localhost:9212 (PID: XXXXX)
# Open http://localhost:9212 — app should load

node bin/crypto-screener.mjs status
# (not implemented yet, will show "Unknown command")

node bin/crypto-screener.mjs stop
# Expected: 🛑 Server stopped (PID: XXXXX)
```

- [ ] **Step 5: Commit**

```bash
git add bin/crypto-screener.mjs
git commit -m "feat: add crypto-screener CLI with start/stop/restart and static file server"
```

---

## Chunk 2: Status, Logs, Update, Version, Help + package.json Integration

### Task 4: Implement `status`, `--version`, and `--help` commands

**Files:**
- Modify: `bin/crypto-screener.mjs`

- [ ] **Step 1: Add `cmdStatus` function**

```javascript
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
```

- [ ] **Step 2: Add `cmdVersion` and `cmdHelp` functions**

```javascript
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
```

- [ ] **Step 3: Wire into command router**

Update the switch statement:

```javascript
    case 'status':
      cmdStatus();
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
```

- [ ] **Step 4: Manual test**

```bash
node bin/crypto-screener.mjs --help
# Expected: usage text

node bin/crypto-screener.mjs --version
# Expected: crypto-screener v1.0.0

node bin/crypto-screener.mjs start
node bin/crypto-screener.mjs status
# Expected: 🟢 Running on http://localhost:9212 (PID: XXXXX, uptime: 0m)

node bin/crypto-screener.mjs stop
node bin/crypto-screener.mjs status
# Expected: 🔴 Server is not running
```

- [ ] **Step 5: Commit**

```bash
git add bin/crypto-screener.mjs
git commit -m "feat: add status, version, and help commands to CLI"
```

---

### Task 5: Implement `logs` command

**Files:**
- Modify: `bin/crypto-screener.mjs`

- [ ] **Step 1: Add `cmdLogs` function**

```javascript
function cmdLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('ℹ️  No log file found. Start the server first.');
    return;
  }

  // Read last 50 lines
  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = content.split('\n');
  const last50 = lines.slice(-51, -1); // last 50 non-empty
  if (last50.length > 0) {
    console.log(last50.join('\n'));
  }

  console.log('\n📋 Tailing log... (Ctrl+C to exit)\n');

  // Follow new content
  let fileSize = fs.statSync(LOG_FILE).size;
  fs.watchFile(LOG_FILE, { interval: 500 }, () => {
    const newSize = fs.statSync(LOG_FILE).size;
    if (newSize > fileSize) {
      const stream = fs.createReadStream(LOG_FILE, { start: fileSize, encoding: 'utf-8' });
      stream.on('data', (chunk) => process.stdout.write(chunk));
      fileSize = newSize;
    }
  });

  // Keep alive until Ctrl+C
  process.on('SIGINT', () => {
    fs.unwatchFile(LOG_FILE);
    process.exit(0);
  });
}
```

- [ ] **Step 2: Wire into command router**

```javascript
    case 'logs':
    case 'log':
      cmdLogs();
      break;
```

- [ ] **Step 3: Manual test**

```bash
node bin/crypto-screener.mjs start
node bin/crypto-screener.mjs logs
# Expected: shows server output, tails for new content
# Ctrl+C to exit

node bin/crypto-screener.mjs stop
```

- [ ] **Step 4: Commit**

```bash
git add bin/crypto-screener.mjs
git commit -m "feat: add logs command with tail-follow mode"
```

---

### Task 6: Implement `update` command

**Files:**
- Modify: `bin/crypto-screener.mjs`

- [ ] **Step 1: Add `cmdUpdate` function**

```javascript
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
    } catch (e) {
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
```

- [ ] **Step 2: Wire into command router**

```javascript
    case 'update':
      await cmdUpdate();
      break;
```

- [ ] **Step 3: Manual test**

```bash
node bin/crypto-screener.mjs start
node bin/crypto-screener.mjs update
# Expected: pull → install → build → restart
node bin/crypto-screener.mjs stop
```

- [ ] **Step 4: Commit**

```bash
git add bin/crypto-screener.mjs
git commit -m "feat: add update command with git pull, rebuild, and auto-restart"
```

---

### Task 7: Update `package.json` with bin field + `npm link`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `bin` field to package.json**

Add after `"type": "module"`:

```json
"bin": {
  "crypto-screener": "./bin/crypto-screener.mjs"
},
```

- [ ] **Step 2: Run `npm link`**

```bash
npm link
```

- [ ] **Step 3: Manual test — global command**

```bash
crypto-screener --help
crypto-screener --version
crypto-screener start
# Open http://localhost:9212
crypto-screener status
crypto-screener stop
```

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add bin field for global CLI installation via npm link"
```

---

### Task 8: Update CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify or create: `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Add to Project Structure section:
```
bin/
  crypto-screener.mjs   — CLI for background server (start/stop/restart/status/update/logs)
```

Add to Commands section:
```
- `crypto-screener start` — Build and serve on port 9212 as background process
- `crypto-screener stop` — Stop background server
- `crypto-screener restart` — Restart server
- `crypto-screener status` — Show server status
- `crypto-screener update` — Pull, install, rebuild, restart
- `crypto-screener logs` — Tail server logs
```

- [ ] **Step 2: Update README.md with CLI usage section**

Add a "CLI Background Server" section documenting installation (`npm link`) and all commands.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add CLI background server documentation"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full lifecycle test**

```bash
crypto-screener start
crypto-screener status
# Open http://localhost:9212 — verify app loads
crypto-screener logs
# Ctrl+C
crypto-screener restart
crypto-screener status
crypto-screener stop
crypto-screener status
# Expected: 🔴 Server is not running
```

- [ ] **Step 2: Error case tests**

```bash
crypto-screener stop          # when not running → "Server is not running"
crypto-screener start
crypto-screener start          # when already running → "Already running..."
crypto-screener stop
```

- [ ] **Step 3: Build verification**

```bash
npm run build
```

Expected: clean build, no errors.
