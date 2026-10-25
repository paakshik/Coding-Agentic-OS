import { create } from 'zustand';
import { Project } from '@shared/types';
import { projectsApi } from '../lib/api';
import { useToast } from './useToast';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (data: { name: string; path: string; description?: string }) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const useProjects = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await projectsApi.list();
      if (res.success) {
        set({ projects: res.data || [], loading: false });
      } else {
        set({ error: res.error || 'Failed to fetch projects', loading: false });
      }
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createProject: async (data) => {
    const res = await projectsApi.create(data);
    if (res.success && res.data) {
      set((state) => ({ projects: [res.data!, ...state.projects] }));
      useToast.getState().show('success', `Project "${res.data!.name}" created`);
      return res.data;
    } else {
      useToast.getState().show('error', res.error || 'Failed to create project');
      return null;
    }
  },

  updateProject: async (id, data) => {
    const res = await projectsApi.update(id, data);
    if (res.success && res.data) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? res.data! : p)),
      }));
      return res.data;
    } else {
      useToast.getState().show('error', res.error || 'Failed to update project');
      return null;
    }
  },

  deleteProject: async (id) => {
    const project = get().projects.find((p) => p.id === id);
    const res = await projectsApi.delete(id);
    if (res.success) {
      set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
      if (project) useToast.getState().show('success', `Project "${project.name}" deleted`);
      return true;
    } else {
      useToast.getState().show('error', res.error || 'Failed to delete project');
      return false;
    }
  },

  refresh: async () => {
    await get().fetchProjects();
  },
}));