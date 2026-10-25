export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  columnId: string;
  order: number;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskColumn {
  id: string;
  projectId: string;
  name: string;
  status: TaskStatus;
  order: number;
  color?: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  taskId?: string;
  skillId?: string;
  status: AgentRunStatus;
  command: string;
  args: string[];
  workingDir: string;
  env?: Record<string, string>;
  output?: string;
  error?: string;
  exitCode?: number;
  startedAt: string;
  completedAt?: string;
  pid?: number;
  metadata?: Record<string, unknown>;
}

export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author?: string;
  sourcePath: string;
  type: SkillType;
  status: SkillStatus;
  tags: string[];
  dependencies: string[];
  entryPoint?: string;
  schemaPath?: string;
  references: SkillReference[];
  assets: SkillAsset[];
  scripts: SkillScript[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  trustLevel: TrustLevel;
  metadata?: Record<string, unknown>;
}

export type SkillType = 'agent' | 'workflow' | 'utility' | 'template';
export type SkillStatus = 'discovered' | 'installed' | 'enabled' | 'disabled' | 'deprecated';
export type TrustLevel = 'untrusted' | 'community' | 'verified' | 'official';

export interface SkillReference {
  id: string;
  name: string;
  path: string;
  type: 'markdown' | 'json' | 'yaml' | 'code' | 'other';
  size: number;
  description?: string;
}

export interface SkillAsset {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'binary' | 'data' | 'other';
  size: number;
  mimeType?: string;
}

export interface SkillScript {
  id: string;
  name: string;
  path: string;
  language: 'bash' | 'python' | 'node' | 'powershell' | 'other';
  description?: string;
  executable: boolean;
}

export interface MemoryEntry {
  id: string;
  projectId?: string;
  scope: MemoryScope;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  source: MemorySource;
  provenance?: MemoryProvenance;
  trustLevel: TrustLevel;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type MemoryScope = 'global' | 'project' | 'session';
export type MemoryType = 'preference' | 'knowledge' | 'observation' | 'decision' | 'pattern' | 'reference';
export type MemorySource = 'user' | 'agent' | 'system' | 'imported';

export interface MemoryProvenance {
  agentRunId?: string;
  skillId?: string;
  sourceUrl?: string;
  confidence?: number;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ActivityEntry {
  id: string;
  projectId?: string;
  type: ActivityType;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_deleted'
  | 'agent_run_started'
  | 'agent_run_completed'
  | 'agent_run_failed'
  | 'agent_run_cancelled'
  | 'skill_discovered'
  | 'skill_installed'
  | 'skill_updated'
  | 'skill_enabled'
  | 'skill_disabled'
  | 'memory_created'
  | 'memory_updated'
  | 'memory_promoted'
  | 'settings_changed';

export interface Settings {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface AppState {
  currentProjectId?: string;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  lastBackupAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskBoardState {
  columns: TaskColumn[];
  tasks: Task[];
  dragState?: {
    taskId: string;
    sourceColumnId: string;
    targetColumnId?: string;
    targetIndex?: number;
  };
}