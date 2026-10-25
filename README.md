# Coding Agentic OS

A local coding command centre for Windows 11 — manage coding agents, tasks, projects, skills, and memory with real Claude Code integration.

## Features

- **Project Management** — Register and validate project paths, track last opened
- **Kanban Task Board** — Persistent task creation, editing, drag-drop movement, history
- **Agent Runs** — Launch and monitor real coding agents, capture output, cancel runs
- **Code Review** — View Git diffs, changed files, review changes
- **Skills System** — Discover, inspect, and manage reusable skills with metadata
- **Memory** — Searchable technical context with trust levels and provenance
- **Activity Feed** — Audit trail of all actions across projects
- **Settings** — Theme, sidebar, and configuration management
- **Single-Click Launch** — Desktop shortcut starts everything automatically

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + better-sqlite3 (SQLite)
- **Desktop**: Electron 30
- **State**: Zustand
- **UI**: Custom CSS with design system, Lucide icons
- **Routing**: React Router v6

## Quick Start

### Prerequisites

- Windows 11
- Node.js 20+ (tested with 24.11.0)
- npm 10+ (tested with 11.6.1)
- Git

### Installation

```cmd
cd D:\Coding-Agentic-OS
npm install
npm run build
```

### Development

```cmd
# Terminal 1: Start backend + frontend dev servers
npm run dev

# Terminal 2: Launch Electron (after Vite is ready)
npm run dev:main
```

### Production Launch

Double-click `Launch-Coding-Agentic-OS.cmd` or the **Coding Agentic OS** desktop shortcut.

The launcher will:
1. Check for existing instances
2. Install dependencies if needed
3. Build if source has changed
4. Start the Electron app with backend services
5. Wait for health check
6. Open the UI

## Project Structure

```
D:\Coding-Agentic-OS\
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry, Express + WebSocket server
│   │   ├── preload.ts     # Secure IPC bridge
│   │   └── db/            # Database schema & repositories
│   ├── renderer/          # React frontend
│   │   ├── pages/         # Page components (9 pages)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # API client
│   │   └── main.tsx       # React entry
│   └── shared/            # Shared TypeScript types
├── public/                # Static assets (icon, index.html)
├── scripts/               # Helper scripts (shortcut creation)
├── docs/                  # Documentation
├── dist/                  # Built output (gitignored)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron.vite.config.ts
├── Launch-Coding-Agentic-OS.cmd
└── README.md
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design, data flow, and security boundaries.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for threat model, secret handling, and filesystem boundaries.

## Integration with Existing Setup

The existing Claude Code setup at `D:\nim-claude` is treated as **read-only**. The application:
- Inspects the launcher scripts and config for integration patterns
- Does not modify any files in `D:\nim-claude`
- Uses the same LiteLLM proxy pattern (localhost:4000) for model access
- Respects the safety rules from `D:\nim-claude\SafetyRules\Claude-Code-Safety-Rules.md`

## Database

SQLite database stored at `%APPDATA%\Coding Agentic OS\coding-agentic-os.db` with tables for:
- Projects, Task Columns, Tasks
- Agent Runs
- Skills
- Memory Entries
- Activity Log
- Settings
- App State

## API Endpoints

Base URL: `http://127.0.0.1:3456`

- `GET /health` — Health check
- `GET/POST/PATCH/DELETE /api/projects` — Project CRUD
- `GET/POST/PATCH/DELETE /api/projects/:id/columns` — Column management
- `GET/POST/PATCH/DELETE /api/projects/:id/tasks` — Task management
- `GET/POST/PATCH /api/projects/:id/agent-runs` — Agent run management
- `GET/POST/PATCH/DELETE /api/skills` — Skill management
- `GET/POST/PATCH/DELETE /api/memory` — Memory management
- `GET /api/activity` — Activity feed
- `GET/POST /api/settings` — Settings
- `GET/PATCH /api/app-state` — App state
- `POST /api/fs/*` — File operations (project-scoped)
- `POST /api/git/*` — Git operations (project-scoped)

WebSocket: `ws://127.0.0.1:3457` for real-time updates.

## License

MIT