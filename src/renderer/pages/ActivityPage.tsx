import React, { useEffect, useState } from 'react';
import { Activity, Search, Filter, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { useCurrentProject } from '../hooks/useAppState';
import { activityApi } from '../lib/api';
import { ActivityEntry, ActivityType } from '@shared/types';

export default function ActivityPage() {
  const currentProject = useCurrentProject();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

  useEffect(() => {
    if (currentProject) {
      loadActivity();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [currentProject]);

  const loadActivity = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await activityApi.list(currentProject.id, 200);
      if (res.success) setEntries(res.data || []);
    } catch (e) {
      console.error('Failed to load activity:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.entityId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'project_created': case 'project_updated': case 'project_deleted': return '📁';
      case 'task_created': case 'task_updated': case 'task_moved': case 'task_deleted': return '📋';
      case 'agent_run_started': case 'agent_run_completed': case 'agent_run_failed': case 'agent_run_cancelled': return '▶️';
      case 'skill_discovered': case 'skill_installed': case 'skill_enabled': case 'skill_disabled': return '📚';
      case 'memory_created': case 'memory_updated': case 'memory_promoted': return '💾';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: ActivityType) => type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">{currentProject ? `Activity for <strong>${currentProject.name}</strong>` : 'Global activity feed'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadActivity} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-content" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input" style={{ flex: 1, minWidth: 240, maxWidth: 400 }}>
              <Search size={16} />
              <input type="text" placeholder="Search activity..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: 40 }} />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)} className="select" style={{ minWidth: 200 }}>
              <option value="all">All Types</option>
              <option value="project_created">Project Created</option>
              <option value="project_updated">Project Updated</option>
              <option value="project_deleted">Project Deleted</option>
              <option value="task_created">Task Created</option>
              <option value="task_updated">Task Updated</option>
              <option value="task_moved">Task Moved</option>
              <option value="task_deleted">Task Deleted</option>
              <option value="agent_run_started">Agent Run Started</option>
              <option value="agent_run_completed">Agent Run Completed</option>
              <option value="agent_run_failed">Agent Run Failed</option>
              <option value="agent_run_cancelled">Agent Run Cancelled</option>
              <option value="skill_discovered">Skill Discovered</option>
              <option value="skill_installed">Skill Installed</option>
              <option value="skill_enabled">Skill Enabled</option>
              <option value="skill_disabled">Skill Disabled</option>
              <option value="memory_created">Memory Created</option>
              <option value="memory_updated">Memory Updated</option>
              <option value="memory_promoted">Memory Promoted</option>
              <option value="settings_changed">Settings Changed</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} className="loading-spinner" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <Activity size={64} />
            <h2 className="empty-state-title">No activity yet</h2>
            <p className="empty-state-description">Activity will appear here as you work with projects, tasks, agents, and skills</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="activity-list" style={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
            {filteredEntries.map(entry => (
              <div key={entry.id} className="activity-item">
                <div className="activity-icon" style={{ fontSize: 16 }}>{getActivityIcon(entry.type)}</div>
                <div className="activity-content">
                  <div className="activity-title">{entry.title}</div>
                  {entry.description && <div className="activity-description">{entry.description}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{getTypeLabel(entry.type)}</span>
                    {entry.entityType && <span>{entry.entityType}: {entry.entityId?.slice(0, 8)}</span>}
                  </div>
                </div>
                <div className="activity-time">{formatRelativeTime(entry.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}