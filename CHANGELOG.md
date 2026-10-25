# Changelog — Coding Agentic OS

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-10-26

### Added
- Initial project scaffold: Electron + React + TypeScript application structure
- SQLite database with 9 migrations (projects, task_columns, tasks, agent_runs, skills, memory_entries, activity_entries, settings, app_state)
- Express REST API covering: projects, task columns, tasks, agent runs, skills, memory, activity, settings, app state, filesystem operations (restricted to projects), git status/diff
- React renderer with router and 9 page components across CORE/DEVELOPMENT/SYSTEM navigation sections
- Full TypeScript type definitions in `@shared/types.ts` for all domain types
- Path traversal protection on all filesystem API endpoints (`/api/fs/read`, `/api/fs/write`, `/api/fs/list`)
- Git operation restrictions on `/api/git/status` and `/api/git/diff` (project-bound, timeout-limited)
- NSIS installer configuration for Windows: desktop shortcut creation, start menu shortcut, icon assignment
- Skills CRUD API endpoints and repository operations
- Memory, activity, and settings API endpoints with repository operations
- App state management via Zustand store with IPC persistence
- Toast notification system for user feedback
- Global search across projects, tasks, and memory
- Breadcrumb navigation showing current project context
- Theme toggle (light/dark/system)
- Notification bell and theme monitor in header
- **Stage 1 Foundation Complete**:
  - Repository layer: Full CRUD for all 9 entities with TypeScript types
  - WebSocket Server: Real-time broadcasts for all entity changes
  - Design system: Dark theme, components (cards, tables, modals, badges, forms, toasts), responsive
  - 9 Page Components: Overview, Projects, Tasks (Kanban), Agent Runs, Code Review, Skills, Memory, Activity, Settings
  - Launcher: `Launch-Coding-Agentic-OS.cmd` with instance check, dep install, build, health check
  - Shortcut Creator: `scripts/create-shortcut.ps1` for desktop shortcut
  - Icons: SVG icon, placeholder ICO
  - Documentation: README.md, PLAN.md, STATUS.md
  - Electron Builder config for NSIS installer with desktop shortcut

### Changed
- (none — initial release)

### Fixed
- (none — initial release)

---

## [Unreleased] — Stage 1 Completion (Next Session)

### Planned
- Dependency installation and production build verification
- Launcher end-to-end testing
- Desktop shortcut creation and verification
- Database persistence verification across restarts
- All CRUD operations tested
- Error state handling verification
- Type-check and lint pass

---

## Release Process
1. Update version in `package.json`
2. Update this CHANGELOG.md
3. Run `npm run build`
4. Run `npm run build:electron` (creates NSIS installer in `release/`)
5. Tag release: `git tag v<version>`
6. Push tags: `git push --tags`