import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { getDatabase, runMigrations } from './db/schema';
import {
  projectsRepo, taskColumnsRepo, tasksRepo, agentRunsRepo,
  skillsRepo, memoryRepo, activityRepo, settingsRepo, appStateRepo,
  initializeProjectColumns
} from './db/repositories';
import { resolveInside, validateProjectPath } from './security/paths';
import { Project, Task, TaskColumn, AgentRun, Skill, MemoryEntry, ActivityEntry, Settings, AppState, ApiResponse } from '../shared/types';

// Set app name before any app.getPath() calls (must be first)
app.setName('Coding Agentic OS');

// isDev = true when running via tsx watch (dev:main) or vite (dev:renderer)
// isDev = false when running via electron . (built files) or packaged app
const isDev = process.env.NODE_ENV === 'development' || process.argv.some(arg => arg.includes('tsx'));

// Generate auth token at startup
const AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
const ALLOWED_HOSTS = new Set(['127.0.0.1:3456', 'localhost:3456', '127.0.0.1:5173', 'localhost:5173']);

let mainWindow: BrowserWindow | null = null;
let expressApp: express.Express;
let httpServer: ReturnType<typeof createServer>;
let wss: WebSocketServer;
const PORT = 3456;
const WS_PORT = 3457;

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  // Allow health check without auth
  if (req.path === '/health') {
    return next();
  }

  // Validate Host header
  const host = req.headers.host;
  if (host && !ALLOWED_HOSTS.has(host)) {
    res.status(403).json({ success: false, error: 'Invalid Host header' });
    return;
  }

  // Check auth token
  const token = req.headers['x-auth-token'] as string;
  if (!token || token !== AUTH_TOKEN) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  next();
}

function createExpressApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS - only allow local Vite dev server
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PATCH, DELETE, OPTIONS'
      );
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
    }

    if (req.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) {
        res.status(403).end();
        return;
      }

      res.status(204).end();
      return;
    }

    next();
  });

  // Apply auth middleware to all /api routes
  app.use('/api', requireAuth);

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Projects API
  app.get('/api/projects', (_req, res) => {
    try {
      const projects = projectsRepo.getAll();
      res.json({ success: true, data: projects });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/projects/:id', (req, res) => {
    try {
      const project = projectsRepo.getById(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      res.json({ success: true, data: project });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/projects', (req, res) => {
    try {
      const { name, path, description } = req.body;
      if (!name || !path) return res.status(400).json({ success: false, error: 'Name and path are required' });
      if (!fs.existsSync(path)) return res.status(400).json({ success: false, error: 'Path does not exist' });
      if (!fs.statSync(path).isDirectory()) return res.status(400).json({ success: false, error: 'Path is not a directory' });

      const project = projectsRepo.create({ name, path, description });
      initializeProjectColumns(project.id);
      activityRepo.create({ projectId: project.id, type: 'project_created', title: `Project "${project.name}" created`, entityType: 'project', entityId: project.id });
      broadcast('project:created', project);
      res.status(201).json({ success: true, data: project });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/projects/:id', (req, res) => {
    try {
      const project = projectsRepo.update(req.params.id, req.body);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      activityRepo.create({ projectId: project.id, type: 'project_updated', title: `Project "${project.name}" updated`, entityType: 'project', entityId: project.id });
      broadcast('project:updated', project);
      res.json({ success: true, data: project });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.delete('/api/projects/:id', (req, res) => {
    try {
      const project = projectsRepo.getById(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      const deleted = projectsRepo.delete(req.params.id);
      if (deleted) {
        activityRepo.create({ projectId: project.id, type: 'project_deleted', title: `Project "${project.name}" deleted`, entityType: 'project', entityId: project.id });
        broadcast('project:deleted', { id: req.params.id });
      }
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Task Columns API
  app.get('/api/projects/:projectId/columns', (req, res) => {
    try {
      const columns = taskColumnsRepo.getByProject(req.params.projectId);
      res.json({ success: true, data: columns });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/projects/:projectId/columns', (req, res) => {
    try {
      const column = taskColumnsRepo.create({ projectId: req.params.projectId, ...req.body });
      res.status(201).json({ success: true, data: column });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/columns/:id', (req, res) => {
    try {
      const column = taskColumnsRepo.update(req.params.id, req.body);
      if (!column) return res.status(404).json({ success: false, error: 'Column not found' });
      res.json({ success: true, data: column });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.delete('/api/columns/:id', (req, res) => {
    try {
      const deleted = taskColumnsRepo.delete(req.params.id);
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Tasks API
  app.get('/api/projects/:projectId/tasks', (req, res) => {
    try {
      const tasks = tasksRepo.getByProject(req.params.projectId);
      res.json({ success: true, data: tasks });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/columns/:columnId/tasks', (req, res) => {
    try {
      const tasks = tasksRepo.getByColumn(req.params.columnId);
      res.json({ success: true, data: tasks });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/tasks/:id', (req, res) => {
    try {
      const task = tasksRepo.getById(req.params.id);
      if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
      res.json({ success: true, data: task });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/projects/:projectId/tasks', (req, res) => {
    try {
      const task = tasksRepo.create({ projectId: req.params.projectId, ...req.body });
      activityRepo.create({ projectId: task.projectId, type: 'task_created', title: `Task "${task.title}" created`, entityType: 'task', entityId: task.id });
      broadcast('task:created', task);
      res.status(201).json({ success: true, data: task });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/tasks/:id', (req, res) => {
    try {
      const task = tasksRepo.update(req.params.id, req.body);
      if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
      const eventType = req.body.columnId && req.body.columnId !== req.body.previousColumnId ? 'task_moved' : 'task_updated';
      activityRepo.create({ projectId: task.projectId, type: eventType, title: `Task "${task.title}" ${eventType === 'task_moved' ? 'moved' : 'updated'}`, entityType: 'task', entityId: task.id });
      broadcast('task:updated', task);
      res.json({ success: true, data: task });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/tasks/:id/move', (req, res) => {
    try {
      const { columnId, order } = req.body;
      const task = tasksRepo.move(req.params.id, columnId, order);
      if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
      activityRepo.create({ projectId: task.projectId, type: 'task_moved', title: `Task "${task.title}" moved`, entityType: 'task', entityId: task.id });
      broadcast('task:moved', task);
      res.json({ success: true, data: task });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/tasks/reorder', (req, res) => {
    try {
      const { taskIds } = req.body;
      tasksRepo.reorder(taskIds);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const task = tasksRepo.getById(req.params.id);
      if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
      const deleted = tasksRepo.delete(req.params.id);
      if (deleted) {
        activityRepo.create({ projectId: task.projectId, type: 'task_deleted', title: `Task "${task.title}" deleted`, entityType: 'task', entityId: task.id });
        broadcast('task:deleted', { id: req.params.id });
      }
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Agent Runs API
  app.get('/api/projects/:projectId/agent-runs', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const runs = agentRunsRepo.getByProject(req.params.projectId, limit);
      res.json({ success: true, data: runs });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/agent-runs/:id', (req, res) => {
    try {
      const run = agentRunsRepo.getById(req.params.id);
      if (!run) return res.status(404).json({ success: false, error: 'Agent run not found' });
      res.json({ success: true, data: run });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/projects/:projectId/agent-runs', (req, res) => {
    try {
      const run = agentRunsRepo.create({ projectId: req.params.projectId, ...req.body });
      activityRepo.create({ projectId: run.projectId, type: 'agent_run_started', title: `Agent run started`, entityType: 'agent_run', entityId: run.id });
      broadcast('agent_run:started', run);
      res.status(201).json({ success: true, data: run });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/agent-runs/:id', (req, res) => {
    try {
      const run = agentRunsRepo.update(req.params.id, req.body);
      if (!run) return res.status(404).json({ success: false, error: 'Agent run not found' });
      const eventType = run.status === 'completed' ? 'agent_run_completed' : run.status === 'failed' ? 'agent_run_failed' : 'agent_run_cancelled';
      activityRepo.create({ projectId: run.projectId, type: eventType, title: `Agent run ${run.status}`, entityType: 'agent_run', entityId: run.id });
      broadcast('agent_run:updated', run);
      res.json({ success: true, data: run });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Skills API
  app.get('/api/skills', (_req, res) => {
    try {
      const skills = skillsRepo.getAll();
      res.json({ success: true, data: skills });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/skills/:id', (req, res) => {
    try {
      const skill = skillsRepo.getById(req.params.id);
      if (!skill) return res.status(404).json({ success: false, error: 'Skill not found' });
      res.json({ success: true, data: skill });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/skills', (req, res) => {
    try {
      const skill = skillsRepo.create(req.body);
      activityRepo.create({ type: 'skill_discovered', title: `Skill "${skill.name}" discovered`, entityType: 'skill', entityId: skill.id });
      broadcast('skill:created', skill);
      res.status(201).json({ success: true, data: skill });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/skills/:id', (req, res) => {
    try {
      const skill = skillsRepo.update(req.params.id, req.body);
      if (!skill) return res.status(404).json({ success: false, error: 'Skill not found' });
      activityRepo.create({ type: 'skill_updated', title: `Skill "${skill.name}" updated`, entityType: 'skill', entityId: skill.id });
      broadcast('skill:updated', skill);
      res.json({ success: true, data: skill });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Memory API
  app.get('/api/memory', (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const entries = memoryRepo.getAll(projectId);
      res.json({ success: true, data: entries });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/memory', (req, res) => {
    try {
      const entry = memoryRepo.create(req.body);
      activityRepo.create({ projectId: entry.projectId, type: 'memory_created', title: `Memory "${entry.title}" created`, entityType: 'memory', entityId: entry.id });
      broadcast('memory:created', entry);
      res.status(201).json({ success: true, data: entry });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/memory/:id', (req, res) => {
    try {
      const entry = memoryRepo.update(req.params.id, req.body);
      if (!entry) return res.status(404).json({ success: false, error: 'Memory entry not found' });
      activityRepo.create({ projectId: entry.projectId, type: 'memory_updated', title: `Memory "${entry.title}" updated`, entityType: 'memory', entityId: entry.id });
      broadcast('memory:updated', entry);
      res.json({ success: true, data: entry });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/memory/:id/promote', (req, res) => {
    try {
      const { trustLevel, verifiedBy } = req.body;
      const entry = memoryRepo.promote(req.params.id, trustLevel, verifiedBy);
      if (!entry) return res.status(404).json({ success: false, error: 'Memory entry not found' });
      activityRepo.create({ projectId: entry.projectId, type: 'memory_promoted', title: `Memory "${entry.title}" promoted to ${trustLevel}`, entityType: 'memory', entityId: entry.id });
      broadcast('memory:promoted', entry);
      res.json({ success: true, data: entry });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.delete('/api/memory/:id', (req, res) => {
    try {
      const deleted = memoryRepo.delete(req.params.id);
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Activity API
  app.get('/api/activity', (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const entries = activityRepo.getRecent(projectId, limit);
      res.json({ success: true, data: entries });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Settings API
  app.get('/api/settings', (_req, res) => {
    try {
      const settings = settingsRepo.getAll();
      res.json({ success: true, data: settings });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.get('/api/settings/:key', (req, res) => {
    try {
      const setting = settingsRepo.getByKey(req.params.key);
      if (!setting) return res.status(404).json({ success: false, error: 'Setting not found' });
      res.json({ success: true, data: setting });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const { key, value, description, category, isSecret } = req.body;
      const setting = settingsRepo.set(key, value, description, category, isSecret);
      res.json({ success: true, data: setting });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // App State API
  app.get('/api/app-state', (_req, res) => {
    try {
      const state = appStateRepo.get();
      res.json({ success: true, data: state });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.patch('/api/app-state', (req, res) => {
    try {
      const state = appStateRepo.update(req.body);
      res.json({ success: true, data: state });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // File system operations (restricted to registered projects)
  app.post('/api/fs/read', (req, res) => {
    try {
      const { projectId, relativePath } = req.body;
      const project = projectsRepo.getById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      let fullPath: string;
      try {
        fullPath = resolveInside(project.path, relativePath);
      } catch {
        return res.status(403).json({ success: false, error: 'Path traversal not allowed' });
      }
      if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'File not found' });

      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json({ success: true, data: { content, path: relativePath } });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/fs/write', (req, res) => {
    try {
      const { projectId, relativePath, content } = req.body;
      const project = projectsRepo.getById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      let fullPath: string;
      try {
        fullPath = resolveInside(project.path, relativePath);
      } catch {
        return res.status(403).json({ success: false, error: 'Path traversal not allowed' });
      }

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      res.json({ success: true, data: { path: relativePath } });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/fs/list', (req, res) => {
    try {
      const { projectId, relativePath = '' } = req.body;
      const project = projectsRepo.getById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      let fullPath: string;
      try {
        fullPath = resolveInside(project.path, relativePath);
      } catch {
        return res.status(403).json({ success: false, error: 'Path traversal not allowed' });
      }
      if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'Path not found' });

      const entries = fs.readdirSync(fullPath, { withFileTypes: true }).map(dirent => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        isFile: dirent.isFile(),
        path: path.join(relativePath, dirent.name),
      }));
      res.json({ success: true, data: entries });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  // Git operations
  app.post('/api/git/status', (req, res) => {
    try {
      const { projectId } = req.body;
      const project = projectsRepo.getById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      // Validate project path
      const pathValidation = validateProjectPath(project.path);
      if (!pathValidation.valid) {
        return res.status(400).json({ success: false, error: pathValidation.error });
      }

      const { execSync } = require('child_process');
      const status = execSync('git status --porcelain', { cwd: project.path, encoding: 'utf-8', timeout: 5000 });
      res.json({ success: true, data: { status: status.trim() } });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post('/api/git/diff', (req, res) => {
    try {
      const { projectId, filePath } = req.body;
      const project = projectsRepo.getById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      // Validate project path
      const pathValidation = validateProjectPath(project.path);
      if (!pathValidation.valid) {
        return res.status(400).json({ success: false, error: pathValidation.error });
      }

      const { execSync } = require('child_process');
      const args = filePath ? ['diff', filePath] : ['diff'];
      const diff = execSync(`git ${args.join(' ')}`, { cwd: project.path, encoding: 'utf-8', timeout: 10000, maxBuffer: 10 * 1024 * 1024 });
      res.json({ success: true, data: { diff: diff.trim() } });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });
  return app;
}

function createWebSocketServer(): WebSocketServer {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws, req) => {
    // Validate auth token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token || token !== AUTH_TOKEN) {
      console.log('WebSocket connection rejected: invalid auth token');
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Validate Host header
    const host = req.headers.host;
    if (host && !ALLOWED_HOSTS.has(host)) {
      console.log('WebSocket connection rejected: invalid Host header');
      ws.close(4003, 'Invalid Host');
      return;
    }

    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
    ws.on('error', (err) => console.error('WebSocket error:', err));
  });

  return wss;
}

function broadcast(event: string, data: any): void {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function createMainWindow(): BrowserWindow {
  // In dev: electron runs from dist/main/src/main/index.js, preload at dist/main/preload.js
  // In prod: electron runs from dist/main/src/main/index.js, preload at dist/main/preload.js
  // Both cases: __dirname = dist/main/src/main, so preload is at ../preload.js
  const preloadPath = path.join(__dirname, '../preload.js');
  const iconPath = path.join(app.getAppPath(), isDev ? 'public/icon.ico' : 'dist/renderer/icon.ico');
  const rendererPath = isDev
    ? 'http://localhost:5173'
    : path.join(app.getAppPath(), 'dist/renderer/index.html');

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Coding Agentic OS',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#0d1117',
  });

  if (isDev) {
    window.loadURL(rendererPath);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(rendererPath);
  }

  // Security: prevent window.open and navigation to external URLs
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = ['http://localhost:5173', `file://${app.getAppPath()}`];
    if (!allowedOrigins.some(origin => url.startsWith(origin))) {
      event.preventDefault();
    }
  });

  window.once('ready-to-show', () => {
    // Send auth token to renderer
    window.webContents.send('auth:token', AUTH_TOKEN);
    window.show();
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
}

function createMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-project') },
        { label: 'Open Project', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-project') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Coding Agentic OS', click: () => mainWindow?.webContents.send('menu:about') },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

async function startBackend(): Promise<void> {
  expressApp = createExpressApp();
  httpServer = createServer(expressApp);
  wss = createWebSocketServer();

  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, '127.0.0.1', () => {
      console.log(`REST API listening on http://127.0.0.1:${PORT}`);
      console.log(`WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
      resolve();
    });
  });
}

async function stopBackend(): Promise<void> {
  wss.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

async function startBackendWithRetry(port: number, maxRetries = 5): Promise<void> {
  expressApp = createExpressApp();
  httpServer = createServer(expressApp);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        httpServer.listen(port, '127.0.0.1', () => {
          console.log(`REST API listening on http://127.0.0.1:${port}`);
          resolve();
        });
        httpServer.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
            console.log(`Port ${port} in use, retrying... (attempt ${attempt + 1}/${maxRetries})`);
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      break;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // WebSocket server on fixed port - create inside promise to catch errors properly
  await new Promise<void>((resolve, reject) => {
    const wsServer = new WebSocketServer({ port: WS_PORT });

    wsServer.on('listening', () => {
      console.log(`WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
      wss = wsServer;
      resolve();
    });
    wsServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`WebSocket port ${WS_PORT} in use`));
      } else {
        reject(err);
      }
    });

    wsServer.on('connection', (ws, req) => {
      // Validate auth token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token || token !== AUTH_TOKEN) {
        console.log('WebSocket connection rejected: invalid auth token');
        ws.close(4001, 'Unauthorized');
        return;
      }

      // Validate Host header
      const host = req.headers.host;
      if (host && !ALLOWED_HOSTS.has(host)) {
        console.log('WebSocket connection rejected: invalid Host header');
        ws.close(4003, 'Invalid Host');
        return;
      }

      console.log('WebSocket client connected');
      ws.on('close', () => console.log('WebSocket client disconnected'));
      ws.on('error', (err) => console.error('WebSocket error:', err));
    });
  });
}

app.whenReady().then(async () => {
  // Initialize database
  getDatabase();
  console.log('Database initialized');

  // Start backend services with port retry
  await startBackendWithRetry(PORT);

  // Create main window
  mainWindow = createMainWindow();
  Menu.setApplicationMenu(createMenu());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', async () => {
  await stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  await stopBackend();
});

// IPC handlers for renderer-to-main communication
ipcMain.handle('dialog:open-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Project Directory',
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('dialog:show-message', async (_e, options: { type: 'info' | 'warning' | 'error'; title: string; message: string }) => {
  await dialog.showMessageBox(mainWindow!, options);
});

ipcMain.handle('shell:open-external', async (_e, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-path', (_e, name: 'userData' | 'temp' | 'home') => app.getPath(name));