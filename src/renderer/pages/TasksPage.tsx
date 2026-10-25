import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { useCurrentProject } from '../hooks/useAppState';
import { tasksApi, columnsApi } from '../lib/api';
import { Task, TaskColumn } from '@shared/types';
import { useToast } from '../hooks/useToast';

const COLUMNS: { status: Task['status']; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
];

export default function TasksPage() {
  const currentProject = useCurrentProject();
  const { show: showToast } = useToast();
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    columnId: '',
    tags: '' as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadData();
    } else {
      setColumns([]);
      setTasks([]);
      setLoading(false);
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [colsRes, tasksRes] = await Promise.all([
        columnsApi.list(currentProject.id),
        tasksApi.list(currentProject.id),
      ]);
      if (colsRes.success) setColumns(colsRes.data || []);
      if (tasksRes.success) setTasks(tasksRes.data || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForColumn = (columnId: string) =>
    tasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order);

  const openCreateModal = (columnId?: string) => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      columnId: columnId || columns[1]?.id || '',
      tags: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      columnId: task.columnId,
      tags: task.tags.join(', '),
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({ title: '', description: '', status: 'todo', priority: 'medium', columnId: '', tags: '' });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.columnId) newErrors.columnId = 'Column is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (editingTask) {
        const res = await tasksApi.update(editingTask.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          columnId: formData.columnId,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
        if (res) {
          showToast('success', `Task "${res.title}" updated`);
          closeModal();
          loadData();
        }
      } else {
        const res = await tasksApi.create(currentProject!.id, {
          columnId: formData.columnId,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          order: getTasksForColumn(formData.columnId).length,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
        if (res) {
          showToast('success', `Task "${res.title}" created`);
          closeModal();
          loadData();
        }
      }
    } catch (err) {
      showToast('error', String(err));
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    const res = await tasksApi.delete(task.id);
    if (res.success) {
      showToast('success', 'Task deleted');
      loadData();
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const badges: Record<Task['status'], string> = {
      backlog: 'badge-backlog',
      todo: 'badge-todo',
      in_progress: 'badge-in_progress',
      review: 'badge-review',
      done: 'badge-done',
    };
    return badges[status];
  };

  const getPriorityBadge = (priority: Task['priority']) => `badge-${priority}`;

  if (!currentProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ flex: 1 }}>
          <LayoutDashboard size={64} />
          <h2 className="empty-state-title">Select a Project</h2>
          <p className="empty-state-description">Choose a project from the header to manage tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Kanban board for <strong>{currentProject.name}</strong></p>
        </div>
        <div className="page-actions">
          <div className="search-input" style={{ maxWidth: 280 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 40 }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} className="loading-spinner" />
        </div>
      ) : (
        <div className="kanban-board" role="list" aria-label="Kanban board">
          {COLUMNS.map(colStatus => {
            const column = columns.find(c => c.status === colStatus.status);
            if (!column) return null;
            const columnTasks = getTasksForColumn(column.id).filter(t =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div key={colStatus.status} className="kanban-column" role="listitem" aria-labelledby={`col-${colStatus.status}`}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: column.color || 'var(--accent-blue)'
                    }} />
                    <span id={`col-${colStatus.status}`}>{colStatus.label}</span>
                  </div>
                  <span className="kanban-column-count">{columnTasks.length}</span>
                </div>
                <div
                  className="kanban-column-content"
                  role="list"
                  aria-label={`${colStatus.label} tasks`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('taskId');
                    if (taskId) {
                      const task = tasks.find(t => t.id === taskId);
                      if (task && task.columnId !== column.id) {
                        tasksApi.move(taskId, column.id, columnTasks.length);
                        loadData();
                      }
                    }
                  }}
                >
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      className="kanban-task"
                      draggable
                      onDragStart={e => e.dataTransfer.setData('taskId', task.id)}
                      onClick={() => openEditModal(task)}
                      role="listitem"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openEditModal(task); }}
                    >
                      <div className="task-header">
                        <h4 className="task-title">{task.title}</h4>
                        <span className={`badge ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="task-description">{task.description}</p>}
                      <div className="task-footer">
                        <div className="task-tags">
                          {task.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                          {task.tags.length > 3 && <span className="tag">+{task.tags.length - 3}</span>}
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{task.id.slice(0, 6)}</span>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
                      Drop tasks here or click + to add
                    </div>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => openCreateModal(column.id)}>
                  <Plus size={12} /> Add Task
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="task-modal-title" className="modal-title">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close"><MoreHorizontal size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="task-title" className="form-label">Title *</label>
                  <input
                    id="task-title"
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="form-input"
                    placeholder="What needs to be done?"
                    autoFocus
                  />
                  {errors.title && <p className="form-error">{errors.title}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="task-description" className="form-label">Description</label>
                  <textarea
                    id="task-description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-textarea"
                    placeholder="Add details..."
                    rows={3}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label htmlFor="task-column" className="form-label">Column *</label>
                    <select
                      id="task-column"
                      value={formData.columnId}
                      onChange={e => setFormData(prev => ({ ...prev, columnId: e.target.value }))}
                      className="form-input select"
                    >
                      {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.columnId && <p className="form-error">{errors.columnId}</p>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-priority" className="form-label">Priority</label>
                    <select
                      id="task-priority"
                      value={formData.priority}
                      onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                      className="form-input select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="task-tags" className="form-label">Tags (comma-separated)</label>
                  <input
                    id="task-tags"
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="form-input"
                    placeholder="bug, frontend, urgent"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                {editingTask && (
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(editingTask!)}>Delete</button>
                )}
                <button type="submit" className="btn btn-primary">{editingTask ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}