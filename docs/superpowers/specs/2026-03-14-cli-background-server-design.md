# CLI Background Server — Design Spec

## Overview

Add a `crypto-screener` CLI command that manages the app as a background process, inspired by [onwatch](https://github.com/onllm-dev/onwatch). The CLI builds the React app, serves static files on a fixed port, and provides start/stop/status/update/restart/logs commands.

## Approach

**Node.js CLI Script (Approach A)** — single `bin/crypto-screener.mjs` file using only Node.js built-ins. Zero additional dependencies. File must have `#!/usr/bin/env node` shebang and be marked executable (`chmod +x`).

## File Structure

```
bin/
  crypto-screener.mjs    — CLI entry point, shebang: #!/usr/bin/env node

~/.crypto-screener/      — Runtime data (created automatically)
  pid                    — PID of background server process
  server.log             — stdout/stderr log output (truncated on each start, max 5MB)
  config.json            — port, project path (auto-generated on first start)
```

## Commands

| Command | Behavior |
|---------|----------|
| `crypto-screener start` | Run `npm run build`, then serve `dist/` on port 9212 as a detached background process. Write PID to `~/.crypto-screener/pid`. |
| `crypto-screener start --port 3000` | Same as `start` but override port. Also accepts `PORT` env var. Priority: `--port` flag > `PORT` env > config.json > default 9212. |
| `crypto-screener stop` | Read PID file, send SIGTERM, verify process exited, remove PID file. |
| `crypto-screener restart` | Convenience alias for `stop` + `start`. |
| `crypto-screener status` | Check PID file existence and whether process is alive. Print running/stopped, port, and uptime. |
| `crypto-screener update` | Run `git pull` → `npm install` → `npm run build`. If server is running, restart it automatically. Show old → new version. |
| `crypto-screener logs` | Show last 50 lines of `~/.crypto-screener/server.log`, then follow for new output. Exit with Ctrl+C. |
| `crypto-screener --version` | Print version from `package.json`. |
| `crypto-screener --help` | Print usage help text. |

## Static File Server

Built with `node:http` and `node:fs` — no external dependencies.

- Serves files from the `dist/` directory produced by `npm run build`
- Content-Type mapping for: `.html`, `.js`, `.css`, `.svg`, `.png`, `.ico`, `.json`, `.woff`, `.woff2`, `.map`
- SPA fallback: any request not matching a static file returns `dist/index.html`
- Gzip compression via `node:zlib` when client sends `Accept-Encoding: gzip`
- Cache headers: `Cache-Control: public, max-age=31536000` for hashed assets (files with hash in name), `no-cache` for `index.html`

## Background Process Architecture

The CLI operates in two modes, distinguished by an internal `--internal-serve` flag:

1. **CLI mode** (default): parses commands, manages process lifecycle
2. **Server mode** (`--internal-serve`): runs the HTTP server, handles SIGTERM for graceful shutdown

Flow for `crypto-screener start`:
```
CLI mode                          Server mode (background)
─────────                         ────────────────────────
npm run build
  ↓
spawn("node", ["bin/crypto-screener.mjs", "--internal-serve"])
  detached: true
  stdio → server.log
  ↓
write PID file
child.unref()
exit CLI
                                  ← HTTP server listening on port
                                  ← handles SIGTERM → server.close() → exit
```

### Graceful Shutdown

The server process listens for `SIGTERM`:
- Calls `server.close()` to stop accepting new connections
- Waits up to 3s for in-flight requests to complete
- Exits with code 0

### Uptime Tracking

Uptime is derived from the PID file's `mtime` (set when the file is written at start time). `status` command computes `Date.now() - fs.statSync(pidFile).mtimeMs`.

## Update Flow

```
crypto-screener update
  ├─ Read current version from package.json
  ├─ Check if .git directory exists
  │   ├─ Yes → git pull origin <current-branch>
  │   └─ No  → skip git pull, print warning
  ├─ Always run npm install (fast no-op when nothing changed)
  ├─ npm run build
  ├─ Read new version from package.json
  ├─ If server was running → stop old → start new
  └─ Print: "Updated: v1.0.0 → v1.1.0" (or "Rebuilt v1.0.0" if same version)
```

## Config File

`~/.crypto-screener/config.json` — auto-created on first `start`:

```json
{
  "port": 9212,
  "projectPath": "/Users/.../crypto-screener"
}
```

This allows the CLI to work from any directory after initial setup.

**Stale projectPath handling**: If `projectPath` no longer exists, print error: `"Project directory not found: <path>. Run 'crypto-screener start' from the project directory to reconfigure."` Then update config with current working directory if it contains a `package.json`.

## Log Management

- `server.log` is truncated (overwritten) on each `start` to prevent unbounded growth
- Maximum size: if log exceeds 5MB during runtime, oldest lines are not actively pruned (acceptable for typical usage patterns where restart is periodic)
- `logs` command: reads last 50 lines initially, then uses `fs.watchFile()` + `fs.createReadStream()` to tail new content. User exits with Ctrl+C.

## Installation

Add to `package.json`:

```json
{
  "bin": {
    "crypto-screener": "./bin/crypto-screener.mjs"
  }
}
```

Run `npm link` to make `crypto-screener` available globally. The `npm link` process handles symlink creation and executable permissions.

## Terminal Output Style

Concise, emoji-prefixed output matching onwatch style:

```
$ crypto-screener start
🔨 Building...
✅ Build complete
🚀 Server started on http://localhost:9212 (PID: 45123)

$ crypto-screener status
🟢 Running on http://localhost:9212 (PID: 45123, uptime: 2h 15m)

$ crypto-screener stop
🛑 Server stopped (PID: 45123)

$ crypto-screener restart
🛑 Server stopped (PID: 45123)
🔨 Building...
✅ Build complete
🚀 Server started on http://localhost:9212 (PID: 45200)

$ crypto-screener update
📦 Pulling latest changes...
📦 Installing dependencies...
🔨 Building...
✅ Updated: v1.0.0 → v1.1.0
🚀 Server restarted on http://localhost:9212

$ crypto-screener logs
[last 50 lines...]
[tailing for new output, Ctrl+C to exit]
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Port already in use | Try `lsof -i :<port>` via `child_process.execSync` to identify occupying process. Print error + suggestion. Falls back to generic "port in use" if `lsof` unavailable. |
| `start` when already running | Print "Already running on port 9212 (PID: X)" and exit |
| `stop` when not running | Print "Server is not running" and exit |
| `update` with no `.git` directory | Print warning, skip git pull, always run npm install + rebuild |
| Build failure | Print build error output, do not start server, exit code 1 |
| No `dist/` directory | Print "Run `crypto-screener start` to build first" |
| Config `projectPath` doesn't exist | Print error with path, offer to reconfigure from cwd |
| Stale PID file (process dead) | Clean up PID file, report as stopped |
| SIGTERM to server process | Graceful shutdown: close HTTP server, wait up to 3s, exit 0 |
| SIGKILL fallback | If SIGTERM doesn't kill within 5s, escalate to SIGKILL |

## Scope Boundaries

- **In scope**: start, stop, restart, status, update, logs, version, help, `--port` flag
- **Out of scope**: HTTPS/TLS, multi-instance support, custom domain, process managers (pm2/systemd), Docker integration
- **Default port**: 9212 (overridable via `--port`, `PORT` env, or config.json)
