# Coding Agentic OS — Implementation Plan

## Phase Overview

| Stage | Status | Description |
|-------|--------|-------------|
| **Stage 0: Audit** | ✅ Complete | Environment inspection, existing setup analysis, project initialization |
| **Stage 1: Foundation** | 🟡 In Progress | Project scaffold, UI shell, navigation, SQLite, Projects page |
| **Stage 2: Skills & Memory** | ⏳ Pending | Skill discovery, inspection, trust levels, memory with provenance |
| **Stage 3: Claude Code Integration** | ⏳ Pending | CLI adapter, process monitoring, auth proxy integration |
| **Stage 4: Code Review & Parallel Work** | ⏳ Pending | Git diff UI, worktree isolation, concurrency limits |
| **Stage 5: Security & Reliability** | ⏳ Pending | Testing, hardening, launcher polish, desktop shortcut |

---

## Stage 0: Audit — COMPLETED ✅

### Completed Tasks
- [x] Inspected runtime environment (Node 24.11.0, npm 11.6.1, Python 3.14.0, Git 2.51)
- [x] Located Claude Code CLI at `C:\Users\Admin\.local/bin/claude`
- [x] Inspected `D:\nim-claude` (read-only): launcher scripts, config.yaml, LiteLLM proxy, safety rules
- [x] Identified integration patterns: LiteLLM proxy on localhost:4000, env vars for auth
- [x] Created project at `D:\Coding-Agentic-OS` with full directory structure
- [x] Initialized git repository

### Key Findings
- Existing setup uses PowerShell launcher → LiteLLM proxy → Claude Code with env vars
- Safety rules documented in `D:\nim-claude\SafetyRules\Claude-Code-Safety-Rules.md`
- No existing skills/agents in `.claude/agents` or `.claude/commands` (only prompt.md)
- Nim-claude uses NVIDIA Nemotron models via LiteLLM with master key auth

### Risks Identified
- LiteLLM proxy must be running for Claude Code integration (external dependency)
- Windows path handling (backslashes vs forward slashes)
- Electron + Vite + Express port conflicts on dev vs prod
- better-sqlite3 native module may need rebuild on different Node versions

---

## Stage 1: Working Foundation — IN PROGRESS 🟡

### Completed ✅
- [x] Package.json with all dependencies
- [x] TypeScript configs (main, renderer, shared)
- [x] Vite configs (renderer + electron main)
- [x] Shared types (Project, Task, AgentRun, Skill, Memory, Activity, Settings, AppState)
- [x] Database schema with 9 migrations + indexes
- [x] Repository layer with full CRUD for all entities
- [x] Express REST API with 40+ endpoints
- [x] WebSocket server for real-time updates
- [x] Electron main process with secure preload
- [x] React app with routing, layout, sidebar navigation (9 sections)
- [x] Design system CSS (dark theme, components, states)
- [x] **OverviewPage** — Stats grid, recent tasks/runs/activity
- [x] **ProjectsPage** — Grid view, create/edit/delete modal, path validation, set active project
- [x] **TasksPage** — Kanban board with 5 columns, drag-drop, create/edit/delete/modal
- [x] **AgentRunsPage** — List, filter, start new run modal, view details with output
- [x] **CodeReviewPage** — Git status, file list, diff viewer with syntax highlighting
- [x] **SkillsPage** — List with filters, create/edit modal, type/status/trust badges
- [x] **MemoryPage** — List with filters, create/edit/promote modals, trust levels
- [x] **ActivityPage** — Filterable activity feed with relative timestamps
- [x] **SettingsPage** — Theme, sidebar, categorized settings, danger zone
- [x] Toast notification system
- [x] Project-scoped file system API (read/write/list)
- [x] Project-scoped Git API (status/diff)
- [x] Launcher script (`Launch-Coding-Agentic-OS.cmd`)
- [x] Shortcut creation script (`scripts/create-shortcut.ps1`)

### In Progress 🟡
- [ ] Install dependencies (`npm install`)
- [ ] Build application (`npm run build`)
- [ ] Test launcher script
- [ ] Create desktop shortcut
- [ ] Verify all pages load without errors
- [ ] Test persistence across restarts

### Acceptance Criteria for Stage 1
- [ ] Application launches via double-click shortcut
- [ ] Backend API responds on http://127.0.0.1:3456/health
- [ ] All 9 navigation pages accessible
- [ ] Projects: create, edit, delete, set active — persists to SQLite
- [ ] Tasks: Kanban board with 5 columns, drag-drop reorder, create/edit/delete — persists
- [ ] Agent Runs: start new run, view output, cancel — persists
- [ ] Code Review: shows git status and diffs for active project
- [ ] Skills: CRUD with metadata, filtering by type/status/trust
- [ ] Memory: CRUD with scope/type/trust, promote flow
- [ ] Activity: shows audit trail for all actions
- [ ] Settings: theme toggle, sidebar collapse, settings persistence
- [ ] No console errors in renderer or main process
- [ ] Database survives app restart

---

## Stage 2: Skills & Memory — PENDING ⏳

### Planned Tasks
- [ ] Skill discovery from filesystem (scan `.claude/agents`, `.claude/commands`, custom paths)
- [ ] SKILL.md parsing (frontmatter + body)
- [ ] Skill references/assets/scripts inspection
- [ ] Trust level system: untrusted → community → verified → official
- [ ] Promotion workflow with approval
- [ ] Memory provenance tracking (agent run ID, skill ID, source URL, confidence)
- [ ] Memory verification workflow
- [ ] Skill recommendations based on project context/task keywords
- [ ] Multi-skill workflow composer (DAG, dependencies, retries, checkpoints)

### Acceptance Criteria
- [ ] Skills auto-discovered from registered skill directories
- [ ] SKILL.md fully parsed with metadata, references, assets, scripts
- [ ] Trust levels enforced (untrusted skills require approval to run)
- [ ] Memory entries track provenance and can be promoted with evidence
- [ ] Skill recommendations appear in task/agent run creation

---

## Stage 3: Claude Code Integration — PENDING ⏳

### Planned Tasks
- [ ] CLI adapter: spawn `claude` with proper env vars (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL)
- [ ] Process monitoring: capture stdout/stderr, track PID, exit code
- [ ] Cancellation: SIGTERM → SIGKILL fallback
- [ ] Health check: verify LiteLLM proxy reachable before launch
- [ ] Auth: read master key from env/user profile, never hardcode
- [ ] Error handling: proxy down, model unavailable, timeout, permission denied
- [ ] Integration with existing `D:\nim-claude` launcher patterns

### Acceptance Criteria
- [ ] "Run Agent" button launches real `claude` process
- [ ] Output streams to UI in real-time
- [ ] Exit code captured, status updated to completed/failed
- [ ] Cancel button terminates process cleanly
- [ ] Errors from proxy/model surfaced in UI with actionable messages
- [ ] No secrets in logs or frontend

---

## Stage 4: Code Review & Parallel Work — PENDING ⏳

### Planned Tasks
- [ ] Enhanced diff view: side-by-side, inline, file tree
- [ ] Review comments on diff lines
- [ ] Approval workflow: request review, approve, request changes
- [ ] Git worktree isolation for concurrent agent runs
- [ ] Concurrency limiter (configurable max parallel agents)
- [ ] Conflict detection: overlapping file edits
- [ ] Merge preview for agent changes

### Acceptance Criteria
- [ ] Diff viewer shows unified/side-by-side with syntax highlighting
- [ ] Reviewers can comment on specific lines
- [ ] Multiple agents can run in isolated worktrees
- [ ] Concurrency limit enforced
- [ ] File edit conflicts detected and reported

---

## Stage 5: Security & Reliability — PENDING ⏳

### Planned Tasks
- [ ] Task persistence tests (crash recovery)
- [ ] Process cleanup on app exit (orphaned agent processes)
- [ ] Startup failure handling (port conflicts, db locked, missing deps)
- [ ] Skill permission system (filesystem, network, process execution scopes)
- [ ] Filesystem boundary enforcement (project-scoped only)
- [ ] Secret redaction in logs/API responses
- [ ] Git isolation verification
- [ ] Launcher repair mechanism (reinstall deps, rebuild, reset db)
- [ ] Build, type-check, lint, test commands all pass
- [ ] Electron builder: NSIS installer with desktop shortcut

### Acceptance Criteria
- [ ] All automated tests pass
- [ ] TypeScript strict mode: zero errors
- [ ] ESLint: zero warnings
- [ ] Launcher handles all error cases gracefully
- [ ] Desktop shortcut created and works
- [ ] No security audit findings (secrets, path traversal, XSS, etc.)

---

## Next Immediate Actions

1. **Run `npm install`** in `D:\Coding-Agentic-OS`
2. **Run `npm run build`** to compile TypeScript and bundle frontend
3. **Test launcher script** `Launch-Coding-Agentic-OS.cmd`
4. **Run shortcut creation script** `scripts/create-shortcut.ps1`
5. **Verify all pages** load and function correctly
6. **Update STATUS.md** with test results

---

## Token Budget Tracking

- Stage 0 + Stage 1 scaffold: ~15,000 tokens (this session)
- Remaining for Stage 1 completion: ~5,000 tokens
- Next session should focus on: install, build, test, shortcut creation