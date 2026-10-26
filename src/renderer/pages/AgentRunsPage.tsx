import React, { useEffect, useState } from 'react';
import { Play, CircleStop as Stop, RefreshCw, Search, Terminal, ChevronDown, MoreHorizontal, X, Copy } from 'lucide-react';
import { useCurrentProject } from '../hooks/useAppState';
import { agentRunsApi } from '../lib/api';
import { AgentRun, AgentRunStatus } from '@shared/types';
import { useToast } from '../hooks/useToast';

export default function AgentRunsPage() {
  const currentProject = useCurrentProject();
  const { show: showToast } = useToast();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [formData, setFormData] = useState({
    command: 'claude',
    args: '',
    workingDir: '',
    taskId: '',
    skillId: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentRunStatus | 'all'>('all');

  useEffect(() => {
    if (currentProject) {
      loadRuns();
    } else {
      setRuns([]);
      setLoading(false);
    }
  }, [currentProject]);

  const loadRuns = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await agentRunsApi.list(currentProject.id, 100);
      if (res.success) setRuns(res.data || []);
    } catch (e) {
      console.error('Failed to load runs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(r => {
    const matchesSearch = r.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.args.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AgentRunStatus) => {
    const badges: Record<AgentRunStatus, string> = {
      pending: 'badge-pending',
      running: 'badge-running',
      completed: 'badge-completed',
      failed: 'badge-failed',
      cancelled: 'badge-cancelled',
    };
    return badges[status];
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      const res = await agentRunsApi.create(currentProject.id, {
        command: formData.command,
        args: formData.args.split(' ').filter(Boolean),
        workingDir: formData.workingDir || currentProject.path,
        taskId: formData.taskId || undefined,
        skillId: formData.skillId || undefined,
      });
      if (res.success && res.data) {
        showToast('success', 'Agent run started');
        setShowModal(false);
        setFormData({ command: 'claude', args: '', workingDir: '', taskId: '', skillId: '' });
        loadRuns();
      } else {
        showToast('error', res.error || 'Failed to start agent run');
      }
    } catch (err) {
      showToast('error', String(err));
    }
  };

  const handleCancelRun = async (run: AgentRun) => {
    try {
      const res = await agentRunsApi.update(run.id, { status: 'cancelled' });
      if (res.success && res.data) {
        showToast('success', 'Run cancelled');
        loadRuns();
      } else {
        showToast('error', res.error || 'Failed to cancel run');
      }
    } catch (err) {
      showToast('error', String(err));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied to clipboard');
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const diff = end - start;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ${secs % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  if (!currentProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ flex: 1 }}>
          <Terminal size={64} />
          <h2 className="empty-state-title">Select a Project</h2>
          <p className="empty-state-description">Choose a project from the header to run coding agents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Runs</h1>
          <p className="page-subtitle">Execute and monitor coding agents for <strong>{currentProject.name}</strong></p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Play size={14} /> Run Agent
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-content" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input" style={{ flex: 1, minWidth: 240 }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Filter runs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 40 }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="select">
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={loadRuns} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={32} className="loading-spinner" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <Terminal size={64} />
            <h2 className="empty-state-title">No agent runs yet</h2>
            <p className="empty-state-description">Start your first coding agent to automate tasks</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Play size={16} /> Run Agent
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Command</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map(run => (
                  <tr key={run.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{run.id.slice(0, 12)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {run.command} {run.args.join(' ')}
                    </td>
                    <td><span className={`badge ${getStatusBadge(run.status)}`}>{run.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDuration(run.startedAt, run.completedAt)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(run.startedAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {run.status === 'running' && (
                          <button className="icon-button" onClick={() => handleCancelRun(run)} aria-label="Cancel run" title="Cancel">
                            <Stop size={14} />
                          </button>
                        )}
                        <button className="icon-button" onClick={() => setSelectedRun(run)} aria-label="View details" title="Details">
                          <Terminal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-labelledby="run-modal-title">
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="run-modal-title" className="modal-title">Run Agent</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <form onSubmit={handleRunAgent}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="run-command" className="form-label">Command *</label>
                  <input
                    id="run-command"
                    type="text"
                    value={formData.command}
                    onChange={e => setFormData(prev => ({ ...prev, command: e.target.value }))}
                    className="form-input"
                    placeholder="claude"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="run-args" className="form-label">Arguments (space-separated)</label>
                  <input
                    id="run-args"
                    type="text"
                    value={formData.args}
                    onChange={e => setFormData(prev => ({ ...prev, args: e.target.value }))}
                    className="form-input"
                    placeholder="--model nemotron-ultra-claude --auto-select"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="run-working-dir" className="form-label">Working Directory</label>
                  <input
                    id="run-working-dir"
                    type="text"
                    value={formData.workingDir}
                    onChange={e => setFormData(prev => ({ ...prev, workingDir: e.target.value }))}
                    className="form-input"
                    placeholder={currentProject.path}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Play size={14} /> Start Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRun && (
        <div className="modal-overlay" onClick={() => setSelectedRun(null)} role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
          <div className="modal" style={{ maxWidth: 800, maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="detail-modal-title" className="modal-title">Run Details</h2>
              <button className="modal-close" onClick={() => setSelectedRun(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0, maxHeight: '60vh' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{selectedRun.id}</div>
                <span className={`badge ${getStatusBadge(selectedRun.status)}`}>{selectedRun.status}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDuration(selectedRun.startedAt, selectedRun.completedAt)}</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Command</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>{selectedRun.command}</code>
                    {selectedRun.args.map((arg, i) => (
                      <code key={i} style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>{arg}</code>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(`${selectedRun.command} ${selectedRun.args.join(' ')}`)}><Copy size={12} /> Copy</button>
                  </div>
                </div>
                {(selectedRun.output || selectedRun.error) && (
                  <div>
                    <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                      {selectedRun.error ? 'Error Output' : 'Output'}
                    </label>
                    <pre style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                      fontSize: 11,
                      lineHeight: 1.6,
                      maxHeight: 300,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      color: selectedRun.error ? 'var(--accent-red)' : 'var(--text-secondary)'
                    }}>
                      {selectedRun.error || selectedRun.output}
                    </pre>
                  </div>
                )}
                {(selectedRun.exitCode !== undefined && selectedRun.exitCode !== null) && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <span>Exit code: <strong>{selectedRun.exitCode}</strong></span>
                    <span>Started: {new Date(selectedRun.startedAt).toLocaleString()}</span>
                    {selectedRun.completedAt && <span>Completed: {new Date(selectedRun.completedAt).toLocaleString()}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}