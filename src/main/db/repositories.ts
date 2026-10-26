import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  Task,
  TaskColumn,
  AgentRun,
  Skill,
  MemoryEntry,
  ActivityEntry,
  Settings,
  AppState,
  TaskStatus,
  TaskPriority,
  AgentRunStatus,
  SkillType,
  SkillStatus,
  TrustLevel,
  MemoryScope,
  MemoryType,
  MemorySource,
  ActivityType,
} from '../../shared/types';
import { getDatabase } from './schema';

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = getDatabase();
  }
  return _db;
}

function now(): string {
  return new Date().toISOString();
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at,
  };
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    columnId: row.column_id,
    order: row.task_order,
    assignee: row.assignee,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToTaskColumn(row: any): TaskColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    status: row.status as TaskStatus,
    order: row.column_order,
    color: row.color,
  };
}

function rowToAgentRun(row: any): AgentRun {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    skillId: row.skill_id,
    status: row.status as AgentRunStatus,
    command: row.command,
    args: JSON.parse(row.args || '[]'),
    workingDir: row.working_dir,
    env: row.env ? JSON.parse(row.env) : undefined,
    output: row.output,
    error: row.error,
    exitCode: row.exit_code,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    pid: row.pid,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToSkill(row: any): Skill {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    version: row.version,
    author: row.author,
    sourcePath: row.source_path,
    type: row.type as SkillType,
    status: row.status as SkillStatus,
    tags: JSON.parse(row.tags || '[]'),
    dependencies: JSON.parse(row.dependencies || '[]'),
    entryPoint: row.entry_point,
    schemaPath: row.schema_path,
    references: JSON.parse(row.references || '[]'),
    assets: JSON.parse(row.assets || '[]'),
    scripts: JSON.parse(row.scripts || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
    trustLevel: row.trust_level as TrustLevel,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToMemoryEntry(row: any): MemoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    scope: row.scope as MemoryScope,
    type: row.type as MemoryType,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    source: row.source as MemorySource,
    provenance: row.provenance ? JSON.parse(row.provenance) : undefined,
    trustLevel: row.trust_level as TrustLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToActivityEntry(row: any): ActivityEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as ActivityType,
    title: row.title,
    description: row.description,
    entityType: row.entity_type,
    entityId: row.entity_id,
    userId: row.user_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
  };
}

function rowToSettings(row: any): Settings {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description,
    category: row.category,
    isSecret: Boolean(row.is_secret),
    updatedAt: row.updated_at,
  };
}

function rowToAppState(row: any): AppState {
  return {
    currentProjectId: row.current_project_id,
    sidebarCollapsed: Boolean(row.sidebar_collapsed),
    theme: row.theme as 'light' | 'dark' | 'system',
    lastBackupAt: row.last_backup_at,
  };
}

// Projects
export const projectsRepo = {
  getAll(): Project[] {
    return getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all().map(rowToProject);
  },

  getById(id: string): Project | undefined {
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? rowToProject(row) : undefined;
  },

  getByPath(path: string): Project | undefined {
    const row = getDb().prepare('SELECT * FROM projects WHERE path = ?').get(path);
    return row ? rowToProject(row) : undefined;
  },

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const id = uuidv4();
    const timestamp = now();
    getDb().prepare(`
      INSERT INTO projects (id, name, path, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.path, data.description || null, timestamp, timestamp);
    return { ...data, id, createdAt: timestamp, updatedAt: timestamp };
  },

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, updatedAt: now() };
    getDb().prepare(`
      UPDATE projects SET name = ?, path = ?, description = ?, updated_at = ?, last_opened_at = ?
      WHERE id = ?
    `).run(updated.name, updated.path, updated.description || null, updated.updatedAt, updated.lastOpenedAt || null, id);
    return updated;
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  },

  setLastOpened(id: string): void {
    getDb().prepare('UPDATE projects SET last_opened_at = ? WHERE id = ?').run(now(), id);
  },
};

// Task Columns
export const taskColumnsRepo = {
  getByProject(projectId: string): TaskColumn[] {
    return getDb().prepare('SELECT * FROM task_columns WHERE project_id = ? ORDER BY column_order').all(projectId).map(rowToTaskColumn);
  },

  getById(id: string): TaskColumn | undefined {
    const row = getDb().prepare('SELECT * FROM task_columns WHERE id = ?').get(id);
    return row ? rowToTaskColumn(row) : undefined;
  },

  create(data: Omit<TaskColumn, 'id'>): TaskColumn {
    const id = uuidv4();
    getDb().prepare(`
      INSERT INTO task_columns (id, project_id, name, status, column_order, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.projectId, data.name, data.status, data.order, data.color || null);
    return { ...data, id };
  },

  update(id: string, data: Partial<Omit<TaskColumn, 'id'>>): TaskColumn | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    getDb().prepare(`
      UPDATE task_columns SET name = ?, status = ?, column_order = ?, color = ?
      WHERE id = ?
    `).run(updated.name, updated.status, updated.order, updated.color || null, id);
    return updated;
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM task_columns WHERE id = ?').run(id);
    return result.changes > 0;
  },

  createDefaults(projectId: string): TaskColumn[] {
    const defaults: Omit<TaskColumn, 'id'>[] = [
      { projectId, name: 'Backlog', status: 'backlog', order: 0, color: '#6b7280' },
      { projectId, name: 'To Do', status: 'todo', order: 1, color: '#3b82f6' },
      { projectId, name: 'In Progress', status: 'in_progress', order: 2, color: '#f59e0b' },
      { projectId, name: 'Review', status: 'review', order: 3, color: '#8b5cf6' },
      { projectId, name: 'Done', status: 'done', order: 4, color: '#10b981' },
    ];
    return defaults.map(d => this.create(d));
  },
};

// Tasks
export const tasksRepo = {
  getByProject(projectId: string): Task[] {
    return getDb().prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY task_order').all(projectId).map(rowToTask);
  },

  getByColumn(columnId: string): Task[] {
    return getDb().prepare('SELECT * FROM tasks WHERE column_id = ? ORDER BY task_order').all(columnId).map(rowToTask);
  },

  getById(id: string): Task | undefined {
    const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return row ? rowToTask(row) : undefined;
  },

  create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = uuidv4();
    const timestamp = now();
    getDb().prepare(`
      INSERT INTO tasks (id, project_id, column_id, title, description, status, priority, task_order, assignee, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.projectId, data.columnId, data.title, data.description || null, data.status, data.priority, data.order, data.assignee || null, JSON.stringify(data.tags), timestamp, timestamp);
    return { ...data, id, createdAt: timestamp, updatedAt: timestamp };
  },

  update(id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, updatedAt: now() };
    if (data.status === 'done' && !existing.completedAt) {
      updated.completedAt = updated.updatedAt;
    }
    getDb().prepare(`
      UPDATE tasks SET project_id = ?, column_id = ?, title = ?, description = ?, status = ?, priority = ?, task_order = ?, assignee = ?, tags = ?, updated_at = ?, completed_at = ?, metadata = ?
      WHERE id = ?
    `).run(
      updated.projectId, updated.columnId, updated.title, updated.description || null, updated.status,
      updated.priority, updated.order, updated.assignee || null, JSON.stringify(updated.tags),
      updated.updatedAt, updated.completedAt || null, JSON.stringify(updated.metadata || {}), id
    );
    return updated;
  },

  move(taskId: string, columnId: string, order: number): Task | undefined {
    return this.update(taskId, { columnId, order });
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  reorder(taskIds: string[]): void {
    const stmt = getDb().prepare('UPDATE tasks SET task_order = ?, updated_at = ? WHERE id = ?');
    const timestamp = now();
    const transaction = getDb().transaction((ids: string[]) => {
      ids.forEach((id, index) => {
        stmt.run(index, timestamp, id);
      });
    });
    transaction(taskIds);
  },
};

// Agent Runs
export const agentRunsRepo = {
  getByProject(projectId: string, limit = 50): AgentRun[] {
    return getDb().prepare('SELECT * FROM agent_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT ?').all(projectId, limit).map(rowToAgentRun);
  },

  getByTask(taskId: string): AgentRun[] {
    return getDb().prepare('SELECT * FROM agent_runs WHERE task_id = ? ORDER BY started_at DESC').all(taskId).map(rowToAgentRun);
  },

  getById(id: string): AgentRun | undefined {
    const row = getDb().prepare('SELECT * FROM agent_runs WHERE id = ?').get(id);
    return row ? rowToAgentRun(row) : undefined;
  },

  getRunning(): AgentRun[] {
    return getDb().prepare("SELECT * FROM agent_runs WHERE status = 'running'").all().map(rowToAgentRun);
  },

  create(data: Omit<AgentRun, 'id' | 'startedAt'>): AgentRun {
    const id = uuidv4();
    const timestamp = now();
    const status = data.status || 'pending';
    getDb().prepare(`
      INSERT INTO agent_runs (id, project_id, task_id, skill_id, status, command, args, working_dir, env, started_at, pid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.projectId, data.taskId || null, data.skillId || null, status, data.command, JSON.stringify(data.args), data.workingDir, JSON.stringify(data.env || {}), timestamp, data.pid || null);
    return { ...data, id, startedAt: timestamp, status };
  },

  update(id: string, data: Partial<Omit<AgentRun, 'id' | 'startedAt'>>): AgentRun | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data };
    if (data.status && ['completed', 'failed', 'cancelled'].includes(data.status) && !existing.completedAt) {
      updated.completedAt = now();
    }
    getDb().prepare(`
      UPDATE agent_runs SET status = ?, output = ?, error = ?, exit_code = ?, completed_at = ?, pid = ?, metadata = ?
      WHERE id = ?
    `).run(
      updated.status, updated.output || null, updated.error || null, updated.exitCode || null,
      updated.completedAt || null, updated.pid || null, JSON.stringify(updated.metadata || {}), id
    );
    return updated;
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM agent_runs WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// Skills
export const skillsRepo = {
  getAll(): Skill[] {
    return getDb().prepare('SELECT * FROM skills ORDER BY name').all().map(rowToSkill);
  },

  getById(id: string): Skill | undefined {
    const row = getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id);
    return row ? rowToSkill(row) : undefined;
  },

  getBySlug(slug: string): Skill | undefined {
    const row = getDb().prepare('SELECT * FROM skills WHERE slug = ?').get(slug);
    return row ? rowToSkill(row) : undefined;
  },

  getByStatus(status: SkillStatus): Skill[] {
    return getDb().prepare('SELECT * FROM skills WHERE status = ? ORDER BY name').all(status).map(rowToSkill);
  },

  create(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Skill {
    const id = uuidv4();
    const timestamp = now();
    getDb().prepare(`
      INSERT INTO skills (id, name, slug, description, version, author, source_path, type, status, tags, dependencies, entry_point, schema_path, "references", assets, scripts, created_at, updated_at, trust_level, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.slug, data.description || null, data.version, data.author || null,
      data.sourcePath, data.type, data.status, JSON.stringify(data.tags), JSON.stringify(data.dependencies),
      data.entryPoint || null, data.schemaPath || null, JSON.stringify(data.references),
      JSON.stringify(data.assets), JSON.stringify(data.scripts), timestamp, timestamp,
      data.trustLevel, JSON.stringify(data.metadata || {})
    );
    return { ...data, id, createdAt: timestamp, updatedAt: timestamp };
  },

  update(id: string, data: Partial<Omit<Skill, 'id' | 'createdAt'>>): Skill | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, updatedAt: now() };
    getDb().prepare(`
      UPDATE skills SET name = ?, slug = ?, description = ?, version = ?, author = ?, source_path = ?, type = ?, status = ?, tags = ?, dependencies = ?, entry_point = ?, schema_path = ?, "references" = ?, assets = ?, scripts = ?, updated_at = ?, last_used_at = ?, trust_level = ?, metadata = ?
      WHERE id = ?
    `).run(
      updated.name, updated.slug, updated.description || null, updated.version, updated.author || null,
      updated.sourcePath, updated.type, updated.status, JSON.stringify(updated.tags), JSON.stringify(updated.dependencies),
      updated.entryPoint || null, updated.schemaPath || null, JSON.stringify(updated.references),
      JSON.stringify(updated.assets), JSON.stringify(updated.scripts), updated.updatedAt,
      updated.lastUsedAt || null, updated.trustLevel, JSON.stringify(updated.metadata || {}), id
    );
    return updated;
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM skills WHERE id = ?').run(id);
    return result.changes > 0;
  },

  setLastUsed(id: string): void {
    getDb().prepare('UPDATE skills SET last_used_at = ? WHERE id = ?').run(now(), id);
  },
};

// Memory
export const memoryRepo = {
  getAll(projectId?: string): MemoryEntry[] {
    if (projectId) {
      return getDb().prepare('SELECT * FROM memory_entries WHERE project_id = ? OR project_id IS NULL ORDER BY updated_at DESC').all(projectId).map(rowToMemoryEntry);
    }
    return getDb().prepare('SELECT * FROM memory_entries ORDER BY updated_at DESC').all().map(rowToMemoryEntry);
  },

  getById(id: string): MemoryEntry | undefined {
    const row = getDb().prepare('SELECT * FROM memory_entries WHERE id = ?').get(id);
    return row ? rowToMemoryEntry(row) : undefined;
  },

  create(data: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): MemoryEntry {
    const id = uuidv4();
    const timestamp = now();
    getDb().prepare(`
      INSERT INTO memory_entries (id, project_id, scope, type, title, content, tags, source, provenance, trust_level, created_at, updated_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.projectId || null, data.scope, data.type, data.title, data.content,
      JSON.stringify(data.tags), data.source, JSON.stringify(data.provenance || {}),
      data.trustLevel, timestamp, timestamp, data.expiresAt || null, JSON.stringify(data.metadata || {})
    );
    return { ...data, id, createdAt: timestamp, updatedAt: timestamp };
  },

  update(id: string, data: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): MemoryEntry | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, updatedAt: now() };
    getDb().prepare(`
      UPDATE memory_entries SET project_id = ?, scope = ?, type = ?, title = ?, content = ?, tags = ?, source = ?, provenance = ?, trust_level = ?, updated_at = ?, expires_at = ?, metadata = ?
      WHERE id = ?
    `).run(
      updated.projectId || null, updated.scope, updated.type, updated.title, updated.content,
      JSON.stringify(updated.tags), updated.source, JSON.stringify(updated.provenance || {}),
      updated.trustLevel, updated.updatedAt, updated.expiresAt || null, JSON.stringify(updated.metadata || {}), id
    );
    return updated;
  },

  promote(id: string, trustLevel: TrustLevel, verifiedBy: string): MemoryEntry | undefined {
    return this.update(id, { trustLevel, provenance: { ...(this.getById(id)?.provenance || {}), verifiedBy, verifiedAt: now() } });
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM memory_entries WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// Activity
export const activityRepo = {
  getRecent(projectId?: string, limit = 50): ActivityEntry[] {
    let query = 'SELECT * FROM activity_entries';
    const params: any[] = [];
    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return getDb().prepare(query).all(...params).map(rowToActivityEntry);
  },

  create(data: Omit<ActivityEntry, 'id' | 'createdAt'>): ActivityEntry {
    const id = uuidv4();
    const timestamp = now();
    getDb().prepare(`
      INSERT INTO activity_entries (id, project_id, type, title, description, entity_type, entity_id, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.projectId || null, data.type, data.title, data.description || null, data.entityType || null, data.entityId || null, data.userId || null, JSON.stringify(data.metadata || {}), timestamp);
    return { ...data, id, createdAt: timestamp };
  },
};

// Settings
export const settingsRepo = {
  getAll(): Settings[] {
    return getDb().prepare('SELECT * FROM settings ORDER BY category, key').all().map(rowToSettings);
  },

  getByKey(key: string): Settings | undefined {
    const row = getDb().prepare('SELECT * FROM settings WHERE key = ?').get(key);
    return row ? rowToSettings(row) : undefined;
  },

  getByCategory(category: string): Settings[] {
    return getDb().prepare('SELECT * FROM settings WHERE category = ? ORDER BY key').all(category).map(rowToSettings);
  },

  set(key: string, value: string, description?: string, category = 'general', isSecret = false): Settings {
    const existing = this.getByKey(key);
    const timestamp = now();
    if (existing) {
      getDb().prepare('UPDATE settings SET value = ?, description = ?, category = ?, is_secret = ?, updated_at = ? WHERE key = ?')
        .run(value, description || null, category, isSecret ? 1 : 0, timestamp, key);
      return { ...existing, value, description, category, isSecret, updatedAt: timestamp };
    } else {
      const id = uuidv4();
      getDb().prepare('INSERT INTO settings (id, key, value, description, category, is_secret, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, key, value, description || null, category, isSecret ? 1 : 0, timestamp);
      return { id, key, value, description, category, isSecret, updatedAt: timestamp };
    }
  },

  delete(key: string): boolean {
    const result = getDb().prepare('DELETE FROM settings WHERE key = ?').run(key);
    return result.changes > 0;
  },
};

// App State
export const appStateRepo = {
  get(): AppState {
    const row = getDb().prepare('SELECT * FROM app_state WHERE id = ?').get('singleton');
    return row ? rowToAppState(row) : { sidebarCollapsed: false, theme: 'system' };
  },

  update(data: Partial<AppState>): AppState {
    const current = this.get();
    const updated = { ...current, ...data };
    getDb().prepare(`
      UPDATE app_state SET current_project_id = ?, sidebar_collapsed = ?, theme = ?, last_backup_at = ?, updated_at = ?
      WHERE id = 'singleton'
    `).run(updated.currentProjectId || null, updated.sidebarCollapsed ? 1 : 0, updated.theme, updated.lastBackupAt || null, now());
    return updated;
  },
};

// Initialize default columns for a project
export function initializeProjectColumns(projectId: string): void {
  const existing = taskColumnsRepo.getByProject(projectId);
  if (existing.length === 0) {
    taskColumnsRepo.createDefaults(projectId);
  }
}