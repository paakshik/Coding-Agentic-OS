# Coding Agentic OS — Security Documentation

## Threat Model

### Assets to Protect
1. **User Source Code** — Project files in registered directories
2. **Credentials** — API keys, tokens, master keys for LiteLLM/Claude Code
3. **Local Data** — SQLite database with tasks, memory, activity, settings
4. **System Integrity** — Application binaries, configuration, launcher
5. **User Privacy** — No telemetry, no external data transmission without consent

### Threat Actors
| Actor | Capability | Motivation |
|-------|------------|------------|
| Malicious Website | XSS, CSRF, fetch to localhost | Data exfiltration, RCE |
| Compromised Dependency | Supply chain attack | Code execution, data theft |
| Malicious Skill | Filesystem, network, process access | Data access, persistence |
| Local User (other account) | File system access | Data access |
| Malicious Agent Output | Prompt injection via agent responses | Privilege escalation |

### Attack Surface
1. **Renderer Process** — Web content (XSS, CSP bypass)
2. **IPC Bridge** — Preload exposed APIs (prototype pollution, privilege escalation)
3. **REST API** — Localhost:3456 (unauthorized access, injection)
4. **WebSocket** — Localhost:3457 (message spoofing, DoS)
5. **File System API** — Path traversal, arbitrary read/write
6. **Git API** — Command injection, repository access
7. **Process Spawning** — Agent execution (command injection, env leakage)
8. **Launcher Script** — Batch/PowerShell injection, privilege escalation

---

## Security Controls

### 1. Process Hardening (Electron)
```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
}
```
- Context Isolation: Renderer runs in separate JS context
- No Node Integration: `require`, `process`, `Buffer` not available
- Sandbox: Chromium sandbox restricts renderer OS access
- Preload Only: Only explicitly exposed APIs via `contextBridge`

### 2. IPC Security (Preload)
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  dialog: { openDirectory, showMessage },
  shell: { openExternal },
  app: { getVersion, getPath },
  onMenuAction: callback,
});
```
- Minimal Surface: Only 7 functions exposed
- No File System Access: Renderer cannot read/write files directly
- No Process Spawning: Renderer cannot execute commands
- Validated Inputs: All IPC arguments validated in main

### 3. Network Binding
```typescript
httpServer.listen(PORT, '127.0.0.1', ...)
wss = new WebSocketServer({ port: WS_PORT })
```
- Loopback Only: Backend and WebSocket bind to `127.0.0.1`
- No External Access: Cannot be reached from network
- Port Selection: Non-standard ports (3456, 3457)

### 4. Filesystem API Protection
```typescript
const fullPath = path.resolve(project.path, relativePath);
if (!fullPath.startsWith(path.resolve(project.path))) {
  return res.status(403).json({ error: 'Path traversal not allowed' });
}
```
- Project Scoping: All operations require valid `projectId`
- Path Resolution: `path.resolve()` normalizes `..`, symlinks
- Boundary Check: `startsWith(projectRoot)` prevents escape
- No Absolute Paths: Renderer sends only relative paths

### 5. Git API Protection
```typescript
const { execSync } = require('child_process');
const status = execSync('git status --porcelain', {
  cwd: project.path,
  encoding: 'utf-8',
  timeout: 5000,
  maxBuffer: 10 * 1024 * 1024
});
```
- Project Scoping: Requires valid `projectId`
- No User Input in Command: Fixed `git status --porcelain` / `git diff [file]`
- Timeouts: Prevents hanging processes
- Buffer Limits: Prevents memory exhaustion
- Working Directory: Enforced via `cwd` option

### 6. Secrets Management
- No Secrets in Code: No API keys, tokens in source
- OS Credential Manager: Keys stored via User environment variables
- Settings Table: `is_secret` column — secret values never returned to frontend
- Env Vars Only: Child processes receive secrets via `env` option
- No Logging: Secrets redacted from all logs

### 7. Input Validation
- TypeScript Types: Shared types enforce structure at compile time
- Runtime Validation: API endpoints validate required fields
- SQL Injection: Parameterized queries via better-sqlite3 (`?` placeholders)
- XSS Prevention: React auto-escapes, no `dangerouslySetInnerHTML`
- CSP: Electron default CSP + `sandbox` attribute

### 8. Skill System Security (Planned)
- Trust Levels: `untrusted` → `community` → `verified` → `official`
- Execution Scope: Skills declare required permissions (fs, net, process)
- Sandboxing: Untrusted skills run in isolated worker/container
- Approval Flow: User must approve promotion, execution of untrusted skills
- Provenance Tracking: Memory entries track source, confidence, verification

---

## Security Checklist

### Implemented
- [x] Context isolation enabled
- [x] Node integration disabled
- [x] Sandbox enabled
- [x] Loopback-only binding
- [x] Path traversal protection
- [x] Parameterized SQL queries
- [x] No secrets in source
- [x] Secret settings excluded from API
- [x] Git command timeouts and limits
- [x] No `dangerouslySetInnerHTML`
- [x] Launcher validates paths
- [x] Instance check prevents duplicate runs

### In Progress / Planned
- [ ] Content Security Policy header
- [ ] Rate limiting on API endpoints
- [ ] Request size limits
- [ ] Skill permission system
- [ ] Skill sandboxing (worker threads)
- [ ] Audit logging for sensitive operations
- [ ] Auto-update verification (code signing)
- [ ] Dependency vulnerability scanning

### Not Applicable (Local-First)
- [ ] Authentication/Authorization (single-user local app)
- [ ] HTTPS/TLS (loopback only)
- [ ] CORS (no cross-origin)
- [ ] Session management (no sessions)
- [ ] Password hashing (no passwords)

---

## Secure Development Practices

### Code Review Requirements
- All changes to `src/main/` require review (trusted process)
- IPC additions must be minimal and validated
- File system / process / network APIs need explicit approval
- Dependency additions scanned for vulnerabilities

### Dependency Management
```bash
npm audit
npm audit fix
npm ci  # In CI/build
```

### Testing Security Features
```bash
# Path traversal attempts
curl -X POST http://127.0.0.1:3456/api/fs/read \
  -d '{"projectId":"...","relativePath":"../../../etc/passwd"}'

# Git command injection
curl -X POST http://127.0.0.1:3456/api/git/diff \
  -d '{"projectId":"...","filePath":"; rm -rf /"}'

# Secret exposure
curl http://127.0.0.1:3456/api/settings | grep -i secret
```

---

## Incident Response

### If Compromise Suspected
1. Kill Electron: `taskkill /IM electron.exe /F`
2. Stop Backend: Launcher script handles cleanup
3. Check Logs: `%APPDATA%\Coding Agentic OS\logs\`
4. Rotate Secrets: Regenerate LiteLLM master key, NVIDIA API key
5. Verify Database: Check for unauthorized modifications
6. Reinstall: Delete `%APPDATA%\Coding Agentic OS`, reinstall from source

### Data Breach (Local)
- Database is local SQLite — no network exposure
- Encrypt at rest if required: SQLCipher or OS-level (BitLocker)
- Backup strategy: User responsibility (export via UI or copy DB file)

---

## Compliance Notes

### Local-First Advantages
- No Cloud Dependencies: All data stays on device
- No Telemetry: Zero network requests to analytics
- User Control: Full source access, modify/verify behavior
- Offline Operation: Works without internet (except model proxy)

### Regulatory
- GDPR: No personal data collected, user controls all data
- CCPA: No sale of data, no third-party sharing
- SOC2: Not applicable (local tool, not SaaS)

---

## Security Contacts
For security issues: Report via secure channel (to be established). Include: steps to reproduce, impact assessment, suggested fix.

## Related Documents
- [Architecture](ARCHITECTURE.md) — System design and data flow
- [README](../README.md) — Quick start and overview
- [Safety Rules](../D:/nim-claude/SafetyRules/Claude-Code-Safety-Rules.md) — Upstream safety rules