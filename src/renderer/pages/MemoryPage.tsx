import React, { useEffect, useState } from 'react';
import { Database, Plus, Search, Filter, MoreHorizontal, ArrowUp, X, Check, AlertTriangle } from 'lucide-react';
import { useCurrentProject } from '../hooks/useAppState';
import { memoryApi } from '../lib/api';
import { MemoryEntry, MemoryScope, MemoryType, TrustLevel, MemorySource } from '@shared/types';
import { useToast } from '../hooks/useToast';

export default function MemoryPage() {
  const currentProject = useCurrentProject();
  const { show: showToast } = useToast();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [trustFilter, setTrustFilter] = useState<TrustLevel | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const [promotingEntry, setPromotingEntry] = useState<MemoryEntry | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    scope: 'project' as MemoryScope,
    type: 'knowledge' as MemoryType,
    tags: '',
    trustLevel: 'untrusted' as TrustLevel,
  });
  const [promoteTrustLevel, setPromoteTrustLevel] = useState<TrustLevel>('community');

  useEffect(() => {
    if (currentProject) {
      loadEntries();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [currentProject]);

  const loadEntries = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await memoryApi.list(currentProject.id);
      if (res.success) setEntries(res.data || []);
    } catch (e) {
      console.error('Failed to load memory:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesScope = scopeFilter === 'all' || e.scope === scopeFilter;
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    const matchesTrust = trustFilter === 'all' || e.trustLevel === trustFilter;
    return matchesSearch && matchesScope && matchesType && matchesTrust;
  });

  const getScopeBadge = (scope: MemoryScope) => {
    const badges: Record<MemoryScope, string> = { global: 'badge-blue', project: 'badge-green', session: 'badge-yellow' };
    return badges[scope];
  };
  const getTypeBadge = (type: MemoryType) => {
    const badges: Record<MemoryType, string> = {
      preference: 'badge-blue', knowledge: 'badge-green', observation: 'badge-yellow',
      decision: 'badge-purple', pattern: 'badge-red', reference: 'badge-low',
    };
    return badges[type];
  };
  const getTrustBadge = (trust: TrustLevel) => {
    const badges: Record<TrustLevel, string> = { untrusted: 'badge-low', community: 'badge-todo', verified: 'badge-done', official: 'badge-high' };
    return badges[trust];
  };
  const getSourceBadge = (source: MemorySource) => {
    const badges: Record<MemorySource, string> = { user: 'badge-blue', agent: 'badge-purple', system: 'badge-green', imported: 'badge-yellow' };
    return badges[source];
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormData({ title: '', content: '', scope: currentProject ? 'project' : 'global', type: 'knowledge', tags: '', trustLevel: 'untrusted' });
    setShowModal(true);
  };

  const openEditModal = (entry: MemoryEntry) => {
    setEditingEntry(entry);
    setFormData({ title: entry.title, content: entry.content, scope: entry.scope, type: entry.type, tags: entry.tags.join(', '), trustLevel: entry.trustLevel });
    setShowModal(true);
  };

  const openPromoteModal = (entry: MemoryEntry) => {
    setPromotingEntry(entry);
    setPromoteTrustLevel(entry.trustLevel === 'untrusted' ? 'community' : entry.trustLevel === 'community' ? 'verified' : 'official');
  };

  const closeModal = () => { setShowModal(false); setEditingEntry(null); };
  const closePromoteModal = () => { setPromotingEntry(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;
    try {
      const data = {
        projectId: currentProject?.id,
        scope: formData.scope,
        type: formData.type,
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        source: 'user' as MemorySource,
        trustLevel: formData.trustLevel,
      };
      if (editingEntry) {
        const res = await memoryApi.update(editingEntry.id, data);
        if (res) { showToast('success', `Memory "${res.title}" updated`); closeModal(); loadEntries(); }
      } else {
        const res = await memoryApi.create(data);
        if (res) { showToast('success', `Memory "${res.title}" created`); closeModal(); loadEntries(); }
      }
    } catch (err) { showToast('error', String(err)); }
  };

  const handlePromote = async () => {
    if (!promotingEntry) return;
    try {
      const res = await memoryApi.promote(promotingEntry.id, promoteTrustLevel, 'user');
      if (res) { showToast('success', `Memory promoted to ${promoteTrustLevel}`); closePromoteModal(); loadEntries(); }
    } catch (err) { showToast('error', String(err)); }
  };

  const handleDelete = async (entry: MemoryEntry) => {
    if (!window.confirm(`Delete memory "${entry.title}"?`)) return;
    const res = await memoryApi.delete(entry.id);
    if (res.success) { showToast('success', 'Memory deleted'); loadEntries(); }
  };

  if (!currentProject) {
    return (
      <div className="page"><div className="empty-state" style={{ flex: 1 }}><Database size={64} /><h2 className="empty-state-title">Select a Project</h2><p className="empty-state-description">Choose a project to manage memory, or create global memory entries</p></div></div>
    );
  }

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Memory</h1><p className="page-subtitle">Searchable technical context for <strong>{currentProject.name}</strong></p></div><div className="page-actions"><button className="btn btn-primary" onClick={openCreateModal}><Plus size={14} /> New Entry</button></div></div>
      <div className="card" style={{ marginBottom: 16 }}><div className="card-content" style={{ padding: 16 }}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}><div className="search-input" style={{ flex: 1, minWidth: 240, maxWidth: 400 }}><Search size={16} /><input type="text" placeholder="Search memory..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: 40 }} /></div><select value={scopeFilter} onChange={e => setScopeFilter(e.target.value as typeof scopeFilter)} className="select"><option value="all">All Scopes</option><option value="global">Global</option><option value="project">Project</option><option value="session">Session</option></select><select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)} className="select"><option value="all">All Types</option><option value="preference">Preference</option><option value="knowledge">Knowledge</option><option value="observation">Observation</option><option value="decision">Decision</option><option value="pattern">Pattern</option><option value="reference">Reference</option></select><select value={trustFilter} onChange={e => setTrustFilter(e.target.value as typeof trustFilter)} className="select"><option value="all">All Trust</option><option value="untrusted">Untrusted</option><option value="community">Community</option><option value="verified">Verified</option><option value="official">Official</option></select></div></div></div>
      {loading ? <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Database size={32} className="loading-spinner" /></div> : filteredEntries.length === 0 ? <div className="card"><div className="empty-state" style={{ padding: 60 }}><Database size={64} /><h2 className="empty-state-title">No memory entries</h2><p className="empty-state-description">Create entries to build your project's knowledge base</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}><Plus size={16} /> Create Entry</button></div></div> : <div className="card"><div className="table-container"><table className="table"><thead><tr><th>Title</th><th>Type</th><th>Scope</th><th>Trust</th><th>Source</th><th>Updated</th><th style={{ width: 100 }}>Actions</th></tr></thead><tbody>{filteredEntries.map(entry => (<tr key={entry.id}><td style={{ maxWidth: 300 }}><div style={{ fontWeight: 500 }}>{entry.title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.content.slice(0, 80)}...</div></td><td><span className={`badge ${getTypeBadge(entry.type)}`}>{entry.type}</span></td><td><span className={`badge ${getScopeBadge(entry.scope)}`}>{entry.scope}</span></td><td><span className={`badge ${getTrustBadge(entry.trustLevel)}`}>{entry.trustLevel}</span></td><td><span className={`badge ${getSourceBadge(entry.source)}`}>{entry.source}</span></td><td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(entry.updatedAt).toLocaleDateString()}</td><td><div style={{ display: 'flex', gap: 4 }}><button className="icon-button" onClick={() => openEditModal(entry)} aria-label="Edit"><ArrowUp size={14} /></button><button className="icon-button" onClick={() => openPromoteModal(entry)} aria-label="Promote"><Check size={14} /></button><button className="icon-button" onClick={() => handleDelete(entry)} aria-label="Delete"><X size={14} /></button></div></td></tr>))}</tbody></table></div></div>}
      {showModal && <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="memory-modal-title"><div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}><div className="modal-header"><h2 id="memory-modal-title" className="modal-title">{editingEntry ? 'Edit Memory' : 'New Memory Entry'}</h2><button className="modal-close" onClick={closeModal} aria-label="Close"><X size={20} /></button></div><form onSubmit={handleSubmit}><div className="modal-body"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}><div className="form-group"><label className="form-label">Title *</label><input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} className="form-input" required /></div><div className="form-group"><label className="form-label">Scope</label><select value={formData.scope} onChange={e => setFormData(prev => ({ ...prev, scope: e.target.value as MemoryScope }))} className="form-input select"><option value="global">Global</option><option value="project">Project</option><option value="session">Session</option></select></div><div className="form-group"><label className="form-label">Type</label><select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as MemoryType }))} className="form-input select"><option value="preference">Preference</option><option value="knowledge">Knowledge</option><option value="observation">Observation</option><option value="decision">Decision</option><option value="pattern">Pattern</option><option value="reference">Reference</option></select></div><div className="form-group"><label className="form-label">Trust Level</label><select value={formData.trustLevel} onChange={e => setFormData(prev => ({ ...prev, trustLevel: e.target.value as TrustLevel }))} className="form-input select"><option value="untrusted">Untrusted</option><option value="community">Community</option><option value="verified">Verified</option><option value="official">Official</option></select></div></div><div className="form-group"><label className="form-label">Content *</label><textarea value={formData.content} onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))} className="form-textarea" rows={5} required /></div><div className="form-group"><label className="form-label">Tags (comma-separated)</label><input value={formData.tags} onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))} className="form-input" placeholder="typescript, react, pattern" /></div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-primary">{editingEntry ? 'Save Changes' : 'Create Entry'}</button></div></form></div></div>}
      {promotingEntry && <div className="modal-overlay" onClick={closePromoteModal} role="dialog" aria-modal="true"><div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}><div className="modal-header"><h2 className="modal-title">Promote Memory</h2><button className="modal-close" onClick={closePromoteModal} aria-label="Close"><X size={20} /></button></div><div className="modal-body"><p>Promote <strong>{promotingEntry.title}</strong> from <strong>{promotingEntry.trustLevel}</strong> to:</p><div className="form-group"><label className="form-label">New Trust Level</label><select value={promoteTrustLevel} onChange={e => setPromoteTrustLevel(e.target.value as TrustLevel)} className="form-input select"><option value="community">Community</option><option value="verified">Verified</option><option value="official">Official</option></select></div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={closePromoteModal}>Cancel</button><button type="button" className="btn btn-primary" onClick={handlePromote}>Promote</button></div></div></div>}
    </div>
  );
}