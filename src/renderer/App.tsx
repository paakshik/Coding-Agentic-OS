import React, { useState, useEffect, useCallback } from 'react';
import { Link, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Play, GitBranch, BookOpen, Database, Activity, Settings,
  ChevronLeft, ChevronRight, Menu, X, Plus, Search, Bell, Moon, Sun, Monitor,
  LogOut, HelpCircle, Info, ExternalLink
} from 'lucide-react';

import { Project, Task, TaskColumn, AgentRun, Skill, MemoryEntry, ActivityEntry, Settings as SettingsType, AppState } from '@shared/types';
import { api } from './lib/api';
import { useToast } from './hooks/useToast';
import { useProjects } from './hooks/useProjects';
import { useAppState } from './hooks/useAppState';

import OverviewPage from './pages/OverviewPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import AgentRunsPage from './pages/AgentRunsPage';
import CodeReviewPage from './pages/CodeReviewPage';
import SkillsPage from './pages/SkillsPage';
import MemoryPage from './pages/MemoryPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';

const NAV_SECTIONS = [
  { key: 'core', title: 'CORE', items: [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/tasks', label: 'Tasks', icon: LayoutDashboard },
    { path: '/runs', label: 'Agent Runs', icon: Play },
  ]},
  { key: 'development', title: 'DEVELOPMENT', items: [
    { path: '/review', label: 'Code Review', icon: GitBranch },
    { path: '/skills', label: 'Skills', icon: BookOpen },
    { path: '/memory', label: 'Memory', icon: Database },
  ]},
  { key: 'system', title: 'SYSTEM', items: [
    { path: '/activity', label: 'Activity', icon: Activity },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]},
];

function Sidebar({ collapsed, onToggle, currentPath }: { collapsed: boolean; onToggle: () => void; currentPath: string }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <span className="sidebar-title">Coding Agentic OS</span>
        <button className="icon-button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="Main menu">
        {NAV_SECTIONS.map((section) => (
          <div key={section.key} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${
                        currentPath === item.path ||
                        (item.path !== '/' && currentPath.startsWith(item.path))
                            ? 'active'
                            : ''
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Monitor size={14} />
          <span>v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}

function Header({ currentProject, onProjectChange, sidebarCollapsed, onToggleSidebar }: {
  currentProject: Project | null;
  onProjectChange: (project: Project | null) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/api/projects').then(res => {
      if (res.success) { // @ts-ignore
        setProjects(res.data);
      }
    });
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button className="icon-button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {sidebarCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
        </button>
        <div className="app-title">
          <ExternalLink size={20} />
          <span>Coding Agentic OS</span>
        </div>
        {currentProject && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-current">{currentProject.name}</span>
          </nav>
        )}
      </div>
      <div className="header-right">
        <div className="search-input" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search projects, tasks, memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 40, width: '100%' }}
            aria-label="Global search"
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            aria-expanded={showProjectPicker}
            aria-haspopup="listbox"
            aria-label="Select project"
          >
            <FolderKanban size={14} />
            {currentProject ? (
              <>
                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProject.name}</span>
                <ChevronRight size={12} />
              </>
            ) : (
              <span>Select Project</span>
            )}
          </button>
          {showProjectPicker && (
            <div className="card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 320, maxWidth: 480, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
              <div className="search-input" style={{ margin: '12px 12px 8px', maxWidth: 'none' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {filteredProjects.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <FolderKanban size={32} />
                    <p className="empty-state-title">No projects found</p>
                    <p className="empty-state-description">Create a new project to get started</p>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onProjectChange(project);
                        setShowProjectPicker(false);
                        setSearchQuery('');
                      }}
                      className="nav-item"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, borderBottom: '1px solid var(--border-primary)' }}
                    >
                      <FolderKanban size={18} />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 500 }}>{project.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{project.path}</div>
                      </div>
                      {currentProject?.id === project.id && <span className="badge badge-done">Active</span>}
                    </button>
                  ))
                )}
              </div>
              <div style={{ padding: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { onProjectChange(null); setShowProjectPicker(false); }}>
                  <Plus size={14} /> New Project
                </button>
              </div>
            </div>
          )}
        </div>
        <button className="icon-button" aria-label="Notifications"><Bell size={20} /></button>
        <button className="icon-button" aria-label="Theme"><Monitor size={20} /></button>
        <button className="icon-button" aria-label="Help"><HelpCircle size={20} /></button>
      </div>
    </header>
  );
}

function AppLayout() {
  const {
    currentProjectId,
    sidebarCollapsed,
    setCurrentProject,
    updateAppState,
    loadAppState,
  } = useAppState();

  const { projects, fetchProjects } = useProjects();
  const currentProject =
      projects.find((project) => project.id === currentProjectId) ?? null;

  const location = useLocation();

  useEffect(() => {
    void loadAppState().catch((error) => {
      console.error('Failed to load application state:', error);
    });

    void fetchProjects().catch((error) => {
      console.error('Failed to load projects:', error);
    });
  }, [loadAppState, fetchProjects]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme =
          useAppState.getState().theme === 'system'
              ? media.matches ? 'dark' : 'light'
              : useAppState.getState().theme;

      root.dataset.theme = resolvedTheme;
    };

    applyTheme();
    media.addEventListener('change', applyTheme);

    return () => media.removeEventListener('change', applyTheme);
  }, [useAppState((state) => state.theme)]);

  const toggleSidebar = useCallback(() => {
    void updateAppState({
      sidebarCollapsed: !useAppState.getState().sidebarCollapsed,
    }).catch((error) => {
      console.error('Failed to update sidebar state:', error);
    });
  }, [updateAppState]);

  const handleMenuAction = useCallback((action: string) => {
    if (action === 'new-project') {
      // Handled by ProjectsPage
    } else if (action === 'open-project') {
      // Handled by ProjectsPage
    }
  }, []);

  useEffect(() => {
    const cleanup = window.electronAPI?.onMenuAction(handleMenuAction);
    return cleanup;
  }, [handleMenuAction]);

  return (
    <div className="app">
      <Header
        currentProject={currentProject}
        onProjectChange={setCurrentProject}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <div className="main-content">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} currentPath={location.pathname} />
        <main className="content-area" role="main">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="runs" element={<AgentRunsPage />} />
        <Route path="review" element={<CodeReviewPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;