# Coding Agentic OS — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Coding Agentic OS (Electron App)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Renderer   │    │    Main      │    │   Backend    │                  │
│  │  (React UI)  │◄──►│  (Electron)  │◄──►│  (Express +  │                  │
│  │              │ IPC │              │     │   WebSocket) │                  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                  │
│                                                  │                          │
│                    ┌─────────────────────────────┼─────────────────────┐  │
│                    ▼                             ▼                     ▼  │
│             ┌─────────────┐              ┌─────────────┐         ┌──────────┐
│             │   SQLite    │              │  File System│         │   Git    │
│             │  (WAL mode) │              │  (Scoped)   │         │  (Scoped)│
│             └─────────────┘              └─────────────┘         └──────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │ LiteLLM Proxy │               │  Claude Code  │
            │ (localhost:4000)              │     CLI       │
            └───────────────┘               └───────────────┘
```

## Process Architecture

### Main Process (`src/main/index.ts`)
- **Electron App**: Window lifecycle, menu, protocol handlers
- **Express Server**: REST API on `http://127.0.0.1:3456`
- **WebSocket Server**: Real-time updates on `ws://127.0.0.1:3457`
- **Database**: SQLite with better-sqlite3 (WAL mode, foreign keys)
- **IPC Handlers**: Secure dialog, shell, app info via preload bridge
- **Process Spawning**: Future Claude Code integration via child_process

### Renderer Process (`src/renderer/`)
- **React 18 + TypeScript + Vite**: SPA with client-side routing
- **Zustand Stores**: Client state (projects, appState, toasts)
- **API Client**: Typed fetch wrapper with error handling
- **Components**: 9 pages, shared UI primitives, design system

### Preload Script (`src/main/preload.ts`)
- **Context Isolation**: Enabled (secure)
- **Exposed API**: `window.electronAPI` with dialog, shell, app methods
- **No Node Integration**: Renderer cannot access Node APIs directly

## Data Flow

### REST API Request Flow
```
User Action (UI)
      │
      ▼
Zustand Store / React Query
      │
      ▼
api.ts (fetch wrapper)
      │
      ▼
HTTP Request → Express Router → Repository → SQLite
      │
      ▼
JSON Response ← Repository ← Express Response
      │
      ▼
Zustand Update → React Re-render
      │
      ▼
WebSocket Broadcast → Other Clients (if any)
```

### Real-time Updates
```
Backend Mutation (POST/PATCH/DELETE)
      │
      ▼
Repository completes write
      │
      ▼
broadcast(event, data) → WebSocketServer.clients
      │
      ▼
Renderer receives message → Updates local store
```

### Agent Run Flow (Future)
```
User clicks "Run Agent"
      │
      ▼
POST /api/projects/:id/agent-runs { command, args, workingDir }
      │
      ▼
Backend spawns child_process (claude CLI)
      │
      ├─► stdout/stderr → captured → DB update (output/error)
      ├─► exit code → DB update (status: completed/failed)
      └─► PID stored for cancellation
      │
      ▼
WebSocket: agent_run:started / agent_run:updated
      │
      ▼
UI updates in real-time
```

## Database Schema

### Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `projects` | Registered coding projects | id, name, path (unique), description, timestamps |
| `task_columns` | Kanban columns per project | id, project_id, name, status, order, color |
| `tasks` | Work items | id, project_id, column_id, title, status, priority, order, tags |
| `agent_runs` | Coding agent executions | id, project_id, task_id, skill_id, status, command, args, output, error, exit_code |
| `skills` | Reusable skill definitions | id, name, slug (unique), type, status, trust_level, source_path, metadata |
| `memory_entries` | Technical context | id, project_id, scope, type, title, content, tags, trust_level, provenance |
| `activity_entries` | Audit log | id, project_id, type, title, entity_type, entity_id, timestamps |
| `settings` | User preferences | id, key (unique), value, category, is_secret |
| `app_state` | Singleton app state | id, current_project_id, sidebar_collapsed, theme |

### Indexes
- Foreign key indexes on all relations
- Status/type/trust_level filters
- Timestamp ordering for activity/history

## Security Boundaries

### Process Isolation
- **Renderer**: No Node access, context isolated, sandboxed
- **Main**: Full Node access, trusted code only
- **Backend**: Runs in main process, bound to loopback only

### Filesystem Access
- All `/api/fs/*` endpoints require `projectId`
- Path resolved: `path.resolve(project.path, relativePath)`
- Validation: `fullPath.startsWith(path.resolve(project.path))`
- No absolute paths accepted from renderer

### Git Operations
- `/api/git/status` and `/api/git/diff` require `projectId`
- Executed via `child_process.execSync` in project directory
- Timeouts: 5s (status), 10s (diff), 10MB buffer limit

### Secrets Handling
- Settings with `is_secret=true` never returned to frontend
- Master keys, API keys stored only in OS credential manager
- LiteLLM master key passed via env var to child processes
- No secrets in logs, DB, or IPC messages

## Integration with Existing Setup

### D:\nim-claude (Read-Only)
- **Launcher Pattern**: PowerShell → LiteLLM proxy → Claude Code with env vars
- **Auth**: `ANTHROPIC_BASE_URL=http://127.0.0.1:4000`, `ANTHROPIC_AUTH_TOKEN=<master_key>`
- **Model Selection**: Automated via probe-verified context windows
- **Safety Rules**: `D:\nim-claude\SafetyRules\Claude-Code-Safety-Rules.md`

### Integration Strategy
1. **Proxy Compatibility**: Our backend can start/manage LiteLLM proxy on :4000
2. **Env Var Injection**: Spawn `claude` with same env vars as nim-claude
3. **Project Context**: Pass working directory from registered project
4. **Skill Execution**: Skills can invoke `claude` via same adapter

## Deployment

### Development
```bash
npm run dev        # Concurrent: Vite (renderer) + tsx watch (main)
npm run dev:main   # Electron main only (after Vite ready)
```

### Production Build
```bash
npm run build      # tsc (main) + vite build (renderer)
npm start          # electron dist/main/index.js
```

### Installer
```bash
npm run build
npx electron-builder --win nsis
# Output: release/Coding Agentic OS Setup 0.1.0.exe
```

### Single-Click Launch
- `Launch-Coding-Agentic-OS.cmd` handles:
  - Instance check
  - Dependency install (if missing)
  - Rebuild (if source changed)
  - Electron launch
  - Health check wait
  - Error reporting

- Desktop shortcut created via `scripts/create-shortcut.ps1`
- Points to launcher script, runs in app directory

## Scalability Considerations

### Current Limits
- SQLite: Single writer, multiple readers (WAL helps)
- Express: Single-threaded Node, adequate for local use
- WebSocket: In-memory client list, single process
- Agent runs: Sequential by default, parallel via worktrees (Stage 4)

### Future Scaling
- Worker threads for heavy operations
- Separate backend process for multi-window support
- Redis for distributed WebSocket (multi-instance)
- PostgreSQL for multi-user (not planned — local-first)

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Electron over Tauri | Mature ecosystem, TypeScript throughout, easier debugging |
| Express over Fastify | Simpler for local API, adequate performance |
| SQLite over PostgreSQL | Zero-config, file-based, portable, WAL for concurrency |
| better-sqlite3 over Prisma | Synchronous API, zero overhead, native performance |
| Zustand over Redux | Minimal boilerplate, TypeScript-first, small bundle |
| Vite over Webpack | Fast HMR, native ESM, simpler config |
| Custom CSS over Tailwind | Design system control, no build dependency, smaller bundle |

## Extension Points

1. **Skill System**: Add skill types, execution engines, composition DAG
2. **Agent Adapters**: Pluggable CLI wrappers (Claude, Codex, custom)
3. **Memory Providers**: Vector DB, semantic search, embedding integration
4. **Project Types**: Language-specific templates, build/run configs
5. **Collaboration**: Shared projects via Git remote, conflict resolution