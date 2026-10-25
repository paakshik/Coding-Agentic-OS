import React, { useEffect, useState } from 'react';
import { FolderKanban, Plus, Edit2, Trash2, ExternalLink, Search, Loader2, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useCurrentProject, useAppState } from '../hooks/useAppState';
import { projectsApi } from '../lib/api';
import { Project } from '@shared/types';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';

export default function ProjectsPage() {
  const { projects, loading, fetchProjects, createProject, updateProject, deleteProject, refresh } = useProjects();
  const { currentProjectId, setCurrentProject } = useAppState();
  const { show: showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: '', path: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validatingPath, setValidatingPath] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created'>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: string | Date = a[sortBy];
      let bVal: string | Date = b[sortBy];
      if (sortBy !== 'name') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const validatePath = async (path: string): Promise<string | null> => {
    if (!path.trim()) return 'Path is required';
    try {
      const res = await api.post<{ success: boolean; error?: string }>('/api/fs/list', { projectId: 'temp', relativePath: '' });
      // We can't validate without a project, so we'll do basic client-side validation
      return null;
    } catch {
      return 'Unable to validate path';
    }
  };

  const handlePathChange = async (value: string) => {
    setFormData(prev => ({ ...prev, path: value }));
    setErrors(prev => ({ ...prev, path: '' }));
    if (value.length > 3) {
      setValidatingPath(true);
      // In a real app, we'd check if path exists via a backend call
      // For now, we'll skip server validation
      setTimeout(() => setValidatingPath(false), 300);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({ name: '', path: '', description: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, path: project.path, description: project.description || '' });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({ name: '', path: '', description: '' });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.path.trim()) newErrors.path = 'Path is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingProject) {
        const res = await updateProject(editingProject.id, formData);
        if (res) {
          showToast('success', `Project "${res.name}" updated`);
          closeModal();
        }
      } else {
        const res = await createProject(formData);
        if (res) {
          showToast('success', `Project "${res.name}" created`);
          closeModal();
          // Optionally set as current project
          setCurrentProject(res);
        }
      }
    } catch (err) {
      showToast('error', String(err));
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    const success = await deleteProject(project.id);
    if (success && currentProjectId === project.id) {
      setCurrentProject(null);
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your registered coding projects</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-content" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input" style={{ flex: 1, minWidth: 240, maxWidth: 400 }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 40 }}
                aria-label="Search projects"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="select"
                style={{ minWidth: 160 }}
                aria-label="Sort by"
              >
                <option value="updated">Recently Updated</option>
                <option value="name">Name (A-Z)</option>
                <option value="created">Date Created</option>
              </select>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
              >
                {sortDir === 'asc' ? <ChevronDown size={14} /> : <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-content" style={{ padding: 48, textAlign: 'center' }}>
            <Loader2 size={32} className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading projects...</p>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <FolderKanban size={64} />
            <h2 className="empty-state-title">No projects yet</h2>
            <p className="empty-state-description">Create your first project to start organizing your coding work</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="project-grid" role="list" aria-label="Projects">
          {filteredProjects.map(project => (
            <article key={project.id} className="project-card" role="listitem">
              <div className="project-card-header">
                <div>
                  <h3 className="project-card-name">{project.name}</h3>
                  <div className="project-card-path" title={project.path}>{project.path}</div>
                </div>
                <div className="project-card-actions">
                  <button
                    className="icon-button"
                    onClick={() => openEditModal(project)}
                    aria-label={`Edit ${project.name}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => handleDelete(project)}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {project.description && (
                <p className="project-card-description">{project.description}</p>
              )}
              <div className="project-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ExternalLink size={14} />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleSelectProject(project)}
                    style={{ padding: '4px 8px', fontSize: 11 }}
                  >
                    {currentProjectId === project.id ? 'Active' : 'Select'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  {project.lastOpenedAt && (
                    <span>Last opened {new Date(project.lastOpenedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="project-modal-title" className="modal-title">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="project-name" className="form-label">Name *</label>
                  <input
                    id="project-name"
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="My Awesome Project"
                    autoFocus
                    disabled={validatingPath}
                  />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="project-path" className="form-label">Path *</label>
                  <div className="input-with-icon">
                    <ExternalLink size={16} />
                    <input
                      id="project-path"
                      type="text"
                      value={formData.path}
                      onChange={e => handlePathChange(e.target.value)}
                      className="form-input"
                      placeholder="D:\\Projects\\my-app"
                      disabled={validatingPath}
                    />
                  </div>
                  {errors.path && <p className="form-error">{errors.path}</p>}
                  {validatingPath && <p className="form-help">Validating path...</p>}
                  <p className="form-help">Must be an existing directory on your filesystem</p>
                </div>
                <div className="form-group">
                  <label htmlFor="project-description" className="form-label">Description</label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-textarea"
                    placeholder="Optional description of this project"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={validatingPath}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}