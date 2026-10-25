import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const DB_NAME = 'coding-agentic-os.db';

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DB_NAME);
}

export function createDatabase(): Database.Database {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrations(db: Database.Database): void {
  const migrations = [
    // Migration 1: Initial schema
    `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_opened_at TEXT
    );
    `,
    // Migration 2: Tasks and columns
    `
    CREATE TABLE IF NOT EXISTS task_columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      column_order INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      column_id TEXT NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      task_order INTEGER NOT NULL DEFAULT 0,
      assignee TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      metadata TEXT
    );
    `,
    // Migration 3: Agent runs
    `
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      skill_id TEXT,
      status TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT NOT NULL DEFAULT '[]',
      working_dir TEXT NOT NULL,
      env TEXT,
      output TEXT,
      error TEXT,
      exit_code INTEGER,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      pid INTEGER,
      metadata TEXT
    );
    `,
    // Migration 4: Skills
    `
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0.0',
      author TEXT,
      source_path TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovered',
      tags TEXT NOT NULL DEFAULT '[]',
      dependencies TEXT NOT NULL DEFAULT '[]',
      entry_point TEXT,
      schema_path TEXT,
      "references" TEXT NOT NULL DEFAULT '[]',
      assets TEXT NOT NULL DEFAULT '[]',
      scripts TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      trust_level TEXT NOT NULL DEFAULT 'untrusted',
      metadata TEXT
    );
    `,
    // Migration 5: Memory
    `
    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      scope TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL,
      provenance TEXT,
      trust_level TEXT NOT NULL DEFAULT 'untrusted',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      metadata TEXT
    );
    `,
    // Migration 6: Activity
    `
    CREATE TABLE IF NOT EXISTS activity_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `,
    // Migration 7: Settings
    `
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      is_secret INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `,
    // Migration 8: App state
    `
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      current_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      sidebar_collapsed INTEGER NOT NULL DEFAULT 0,
      theme TEXT NOT NULL DEFAULT 'system',
      last_backup_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    `,
    // Migration 9: Indexes
    `
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_task_id ON agent_runs(task_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
    CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
    CREATE INDEX IF NOT EXISTS idx_memory_project_id ON memory_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_entries(scope);
    CREATE INDEX IF NOT EXISTS idx_memory_trust ON memory_entries(trust_level);
    CREATE INDEX IF NOT EXISTS idx_activity_project_id ON activity_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_entries(created_at);
    `,
  ];

  for (const migration of migrations) {
    db.exec(migration);
  }

  // Ensure default columns exist for each project (handled in application code)
  // Ensure app_state singleton exists
  db.prepare(`
    INSERT OR IGNORE INTO app_state (id, current_project_id, sidebar_collapsed, theme)
    VALUES ('singleton', NULL, 0, 'system')
  `).run();
}

export function getDatabase(): Database.Database {
  const db = createDatabase();
  runMigrations(db);
  return db;
}