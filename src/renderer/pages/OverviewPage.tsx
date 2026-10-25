import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, LayoutDashboard, Play, BookOpen, Database, Activity,
  Plus, ArrowUpRight, TrendingUp, Clock, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useCurrentProject } from '../hooks/useAppState';
import { tasksApi, agentRunsApi, skillsApi, memoryApi, activityApi } from '../lib/api';
import { Project, Task, AgentRun, Skill, MemoryEntry, ActivityEntry } from '@shared/types';

const statCards = [
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'blue' as const },
  { key: 'tasks', label: 'Tasks', icon: LayoutDashboard, color: 'green' as const },
  { key: 'runs', label: 'Agent Runs', icon: Play, color: 'yellow' as const },
  { key: 'skills', label: 'Skills', icon: BookOpen, color: 'purple' as const },
  { key: 'memory', label: 'Memory Entries', icon: Database, color: 'red' as const },
  { key: 'activity', label: 'Recent Activity', icon: Activity, color: 'blue' as const },
];

type StatKey = typeof statCards[number]['key'];

interface Stats {
  projects: number;
  tasks: number;
  runs: number;
  skills: number;
  memory: number;
  activity: number;
  recentTasks: Task[];
  recentRuns: AgentRun[];
  recentActivity: ActivityEntry[];
  loading: Record<StatKey, boolean>;
}

export default function OverviewPage() {
  const { projects, fetchProjects, loading: projectsLoading } = useProjects();
  const currentProject = useCurrentProject();
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    tasks: 0,
    runs: 0,
    skills: 0,
    memory: 0,
    activity: 0,
    recentTasks: [],
    recentRuns: [],
    recentActivity: [],
    loading: {
      projects: true,
      tasks: true,
      runs: true,
      skills: true,
      memory: true,
      activity: true,
    },
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [currentProject?.id]);

  const loadStats = async () => {
    setStats(s => ({ ...s, loading: { ...s.loading, projects: true } }));
    try {
      const [tasksRes, runsRes, skillsRes, memoryRes, activityRes] = await Promise.all([
        currentProject ? tasksApi.list(currentProject.id) : Promise.resolve({ success: true, data: [] }),
        currentProject ? agentRunsApi.list(currentProject.id, 10) : Promise.resolve({ success: true, data: [] }),
        skillsApi.list(),
        currentProject ? memoryApi.list(currentProject.id) : Promise.resolve({ success: true, data: [] }),
        activityApi.list(currentProject?.id, 10),
      ]);

      const allTasks = tasksRes.success ? tasksRes.data || [] : [];
      const recentTasks = allTasks
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      const allRuns = runsRes.success ? runsRes.data || [] : [];
      const allSkills = skillsRes.success ? skillsRes.data || [] : [];
      const allMemory = memoryRes.success ? memoryRes.data || [] : [];
      const allActivity = activityRes.success ? activityRes.data || [] : [];

      setStats({
        projects: projects.length,
        tasks: allTasks.length,
        runs: allRuns.length,
        skills: allSkills.length,
        memory: allMemory.length,
        activity: allActivity.length,
        recentTasks,
        recentRuns: allRuns.slice(0, 5),
        recentActivity: allActivity.slice(0, 5),
        loading: {
          projects: false,
          tasks: false,
          runs: false,
          skills: false,
          memory: false,
          activity: false,
        },
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
      setStats(s => ({ ...s, loading: { ...s.loading, projects: false, tasks: false, runs: false, skills: false, memory: false, activity: false } }));
    }
  };

  const getStatIcon = (key: StatKey) => {
    const card = statCards.find(c => c.key === key);
    return card?.icon || LayoutDashboard;
  };

  const getStatColor = (key: StatKey) => {
    const card = statCards.find(c => c.key === key);
    return card?.color || 'blue';
  };

  const StatCard = ({ key: statKey, label, icon: Icon, color }: { key: StatKey; label: string; icon: React.ComponentType<{ size?: number }>; color: string }) => {
    const value = stats[statKey];
    const loading = stats.loading[statKey];
    const colorClasses = {
      blue: 'stat-icon',
      green: 'stat-icon green',
      yellow: 'stat-icon yellow',
      red: 'stat-icon red',
      purple: 'stat-icon purple',
    };

    return (
      <Link to={`/${statKey === 'projects' ? 'projects' : statKey === 'tasks' ? 'tasks' : statKey === 'runs' ? 'runs' : statKey === 'skills' ? 'skills' : statKey === 'memory' ? 'memory' : 'activity'}`} className="stat-card">
        <div className={colorClasses[color as keyof typeof colorClasses]}>
          <Icon size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">
            {loading ? <Loader2 size={28} className="loading-spinner" /> : value}
          </div>
          <div className="stat-label">{label}</div>
        </div>
      </Link>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      backlog: 'badge-backlog',
      todo: 'badge-todo',
      in_progress: 'badge-in_progress',
      review: 'badge-review',
      done: 'badge-done',
      running: 'badge-running',
      completed: 'badge-completed',
      failed: 'badge-failed',
      cancelled: 'badge-cancelled',
      pending: 'badge-pending',
    };
    return badges[status] || 'badge-backlog';
  };

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

  if (!currentProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ flex: 1 }}>
          <FolderKanban size={64} />
          <h2 className="empty-state-title">Welcome to Coding Agentic OS</h2>
          <p className="empty-state-description">Select or create a project from the header to get started with your coding command centre.</p>
          <div style={{ marginTop: 24 }}>
            <Link to="/projects"><button className="btn btn-primary"><Plus size={16} /> Create Project</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Project dashboard for <strong>{currentProject.name}</strong></p>
        </div>
        <div className="page-actions">
          <Link to="/tasks"><button className="btn btn-primary"><Plus size={14} /> New Task</button></Link>
          <Link to="/runs"><button className="btn btn-secondary"><Play size={14} /> Run Agent</button></Link>
        </div>
      </div>

      <div className="stats-grid" role="list" aria-label="Project statistics">
        {statCards.map(card => (
          <StatCard key={card.key} {...card} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <section className="card" aria-labelledby="recent-tasks-heading">
          <div className="card-header">
            <h2 id="recent-tasks-heading" className="card-title">Recent Tasks</h2>
            <Link to="/tasks" className="btn btn-ghost btn-sm"><ArrowUpRight size={14} /> View All</Link>
          </div>
          <div className="card-content">
            {stats.loading.tasks ? (
              <div className="empty-state" style={{ padding: 32 }}><Loader2 size={24} className="loading-spinner" /></div>
            ) : stats.recentTasks.length === 0 ? (
              <div className="empty-state">
                <LayoutDashboard size={32} />
                <p className="empty-state-title">No tasks yet</p>
                <p className="empty-state-description">Create your first task to start tracking work</p>
                <Link to="/tasks"><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}><Plus size={12} /> Create Task</button></Link>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTasks.map(task => (
                      <tr key={task.id}>
                        <td>
                          <Link to={`/tasks/${task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            <div style={{ fontWeight: 500 }}>{task.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{task.id.slice(0, 8)}</div>
                          </Link>
                        </td>
                        <td><span className={`badge ${getStatusBadge(task.status)}`}>{task.status.replace('_', ' ')}</span></td>
                        <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatRelativeTime(task.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="recent-runs-heading">
          <div className="card-header">
            <h2 id="recent-runs-heading" className="card-title">Recent Agent Runs</h2>
            <Link to="/runs" className="btn btn-ghost btn-sm"><ArrowUpRight size={14} /> View All</Link>
          </div>
          <div className="card-content">
            {stats.loading.runs ? (
              <div className="empty-state" style={{ padding: 32 }}><Loader2 size={24} className="loading-spinner" /></div>
            ) : stats.recentRuns.length === 0 ? (
              <div className="empty-state">
                <Play size={32} />
                <p className="empty-state-title">No agent runs yet</p>
                <p className="empty-state-description">Execute coding agents to automate tasks</p>
                <Link to="/runs"><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}><Plus size={12} /> Run Agent</button></Link>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Run</th>
                      <th>Status</th>
                      <th>Command</th>
                      <th>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentRuns.map(run => (
                      <tr key={run.id}>
                        <td>
                          <Link to={`/runs/${run.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{run.id.slice(0, 12)}</div>
                          </Link>
                        </td>
                        <td><span className={`badge ${getStatusBadge(run.status)}`}>{run.status}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.command} {run.args.join(' ')}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatRelativeTime(run.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="recent-activity-heading" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h2 id="recent-activity-heading" className="card-title">Recent Activity</h2>
            <Link to="/activity" className="btn btn-ghost btn-sm"><ArrowUpRight size={14} /> View All</Link>
          </div>
          <div className="card-content">
            {stats.loading.activity ? (
              <div className="empty-state" style={{ padding: 32 }}><Loader2 size={24} className="loading-spinner" /></div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="empty-state">
                <Activity size={32} />
                <p className="empty-state-title">No recent activity</p>
                <p className="empty-state-description">Activity will appear here as you work</p>
              </div>
            ) : (
              <div className="activity-list">
                {stats.recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      <Activity size={16} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      {activity.description && <div className="activity-description">{activity.description}</div>}
                    </div>
                    <div className="activity-time">{formatRelativeTime(activity.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}