import { create } from 'zustand';
import { AppState, Project } from '@shared/types';
import { appStateApi, projectsApi } from '../lib/api';
import { useProjects } from './useProjects';

interface AppStateStore extends AppState {
  setCurrentProject: (project: Project | null) => void;
  loadAppState: () => Promise<void>;
  updateAppState: (data: Partial<AppState>) => Promise<void>;
}

export const useAppState = create<AppStateStore>((set, get) => ({
  currentProjectId: undefined,
  sidebarCollapsed: false,
  theme: 'system',
  lastBackupAt: undefined,

  setCurrentProject: (project) => {
    set({ currentProjectId: project?.id });
    if (project) {
      appStateApi.update({ currentProjectId: project.id });
    } else {
      appStateApi.update({ currentProjectId: null });
    }
  },

  loadAppState: async () => {
    const res = await appStateApi.get();
    if (res.success && res.data) {
      set(res.data);
      if (res.data.currentProjectId) {
        const projectRes = await projectsApi.get(res.data.currentProjectId);
        if (!projectRes.success || !projectRes.data) {
          set({ currentProjectId: undefined });
        }
      }
    }
  },

  updateAppState: async (data) => {
    const res = await appStateApi.update(data);
    if (res.success && res.data) {
      set(res.data);
    }
  },
}));

export function useCurrentProject() {
  const { currentProjectId } = useAppState();
  const { projects } = useProjects();
  return projects.find(p => p.id === currentProjectId) || null;
}