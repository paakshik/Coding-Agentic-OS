const API_BASE = 'http://127.0.0.1:3456';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const { params, headers, ...fetchOptions } = options;
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: defaultHeaders,
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => request<T>(endpoint, { method: 'GET', params }),
  post: <T>(endpoint: string, data?: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data?: unknown) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// Projects
export const projectsApi = {
  list: () => api.get<{ success: boolean; data: Project[] }>('/api/projects'),
  get: (id: string) => api.get<{ success: boolean; data: Project }>(`/api/projects/${id}`),
  create: (data: { name: string; path: string; description?: string }) => api.post<{ success: boolean; data: Project }>('/api/projects', data),
  update: (id: string, data: Partial<{ name: string; path: string; description: string }>) => api.patch<{ success: boolean; data: Project }>(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/projects/${id}`),
};

// Task Columns
export const columnsApi = {
  list: (projectId: string) => api.get<{ success: boolean; data: TaskColumn[] }>(`/api/projects/${projectId}/columns`),
  create: (projectId: string, data: { name: string; status: string; order: number; color?: string }) => api.post<{ success: boolean; data: TaskColumn }>(`/api/projects/${projectId}/columns`, data),
  update: (id: string, data: Partial<{ name: string; status: string; order: number; color: string }>) => api.patch<{ success: boolean; data: TaskColumn }>(`/api/columns/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/columns/${id}`),
};

// Tasks
export const tasksApi = {
  list: (projectId: string) => api.get<{ success: boolean; data: Task[] }>(`/api/projects/${projectId}/tasks`),
  byColumn: (columnId: string) => api.get<{ success: boolean; data: Task[] }>(`/api/columns/${columnId}/tasks`),
  get: (id: string) => api.get<{ success: boolean; data: Task }>(`/api/tasks/${id}`),
  create: (projectId: string, data: { columnId: string; title: string; description?: string; status: string; priority: string; order: number; assignee?: string; tags?: string[] }) => api.post<{ success: boolean; data: Task }>(`/api/projects/${projectId}/tasks`, data),
  update: (id: string, data: Partial<Task>) => api.patch<{ success: boolean; data: Task }>(`/api/tasks/${id}`, data),
  move: (id: string, columnId: string, order: number) => api.post<{ success: boolean; data: Task }>(`/api/tasks/${id}/move`, { columnId, order }),
  reorder: (taskIds: string[]) => api.post<{ success: boolean }>('/api/tasks/reorder', { taskIds }),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/tasks/${id}`),
};

// Agent Runs
export const agentRunsApi = {
  list: (projectId: string, limit?: number) => api.get<{ success: boolean; data: AgentRun[] }>(`/api/projects/${projectId}/agent-runs`, limit ? { limit: String(limit) } : undefined),
  get: (id: string) => api.get<{ success: boolean; data: AgentRun }>(`/api/agent-runs/${id}`),
  create: (projectId: string, data: { taskId?: string; skillId?: string; command: string; args: string[]; workingDir: string; env?: Record<string, string> }) => api.post<{ success: boolean; data: AgentRun }>(`/api/projects/${projectId}/agent-runs`, data),
  update: (id: string, data: Partial<AgentRun>) => api.patch<{ success: boolean; data: AgentRun }>(`/api/agent-runs/${id}`, data),
};

// Skills
export const skillsApi = {
  list: () => api.get<{ success: boolean; data: Skill[] }>('/api/skills'),
  get: (id: string) => api.get<{ success: boolean; data: Skill }>(`/api/skills/${id}`),
  create: (data: Partial<Skill>) => api.post<{ success: boolean; data: Skill }>('/api/skills', data),
  update: (id: string, data: Partial<Skill>) => api.patch<{ success: boolean; data: Skill }>(`/api/skills/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/skills/${id}`),
};

// Memory
export const memoryApi = {
  list: (projectId?: string) => api.get<{ success: boolean; data: MemoryEntry[] }>('/api/memory', projectId ? { projectId } : undefined),
  create: (data: Partial<MemoryEntry>) => api.post<{ success: boolean; data: MemoryEntry }>('/api/memory', data),
  update: (id: string, data: Partial<MemoryEntry>) => api.patch<{ success: boolean; data: MemoryEntry }>(`/api/memory/${id}`, data),
  promote: (id: string, trustLevel: string, verifiedBy: string) => api.post<{ success: boolean; data: MemoryEntry }>(`/api/memory/${id}/promote`, { trustLevel, verifiedBy }),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/memory/${id}`),
};

// Activity
export const activityApi = {
  list: (projectId?: string, limit?: number) => api.get<{ success: boolean; data: ActivityEntry[] }>('/api/activity', { ...(projectId ? { projectId } : {}), ...(limit ? { limit: String(limit) } : {}) }),
};

// Settings
export const settingsApi = {
  list: () => api.get<{ success: boolean; data: Settings[] }>('/api/settings'),
  get: (key: string) => api.get<{ success: boolean; data: Settings }>(`/api/settings/${key}`),
  set: (key: string, value: string, description?: string, category?: string, isSecret?: boolean) => api.post<{ success: boolean; data: Settings }>('/api/settings', { key, value, description, category, isSecret }),
  delete: (key: string) => api.delete<{ success: boolean }>(`/api/settings/${key}`),
};

// App State
export const appStateApi = {
  get: () => api.get<{ success: boolean; data: AppState }>('/api/app-state'),
  update: (data: Partial<AppState>) => api.patch<{ success: boolean; data: AppState }>('/api/app-state', data),
};

// File System
export const fsApi = {
  read: (projectId: string, relativePath: string) => api.post<{ success: boolean; data: { content: string; path: string } }>('/api/fs/read', { projectId, relativePath }),
  write: (projectId: string, relativePath: string, content: string) => api.post<{ success: boolean; data: { path: string } }>('/api/fs/write', { projectId, relativePath, content }),
  list: (projectId: string, relativePath?: string) => api.post<{ success: boolean; data: { name: string; isDirectory: boolean; isFile: boolean; path: string }[] }>('/api/fs/list', { projectId, relativePath: relativePath || '' }),
};

// Git
export const gitApi = {
  status: (projectId: string) => api.post<{ success: boolean; data: { status: string } }>('/api/git/status', { projectId }),
  diff: (projectId: string, filePath?: string) => api.post<{ success: boolean; data: { diff: string } }>('/api/git/diff', { projectId, filePath }),
};

// Types (re-export from shared)
export type { Project, Task, TaskColumn, AgentRun, Skill, MemoryEntry, ActivityEntry, Settings, AppState } from '@shared/types';