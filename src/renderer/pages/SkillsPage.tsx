import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Search, Filter, MoreHorizontal, ExternalLink, Check, AlertTriangle, X } from 'lucide-react';
import { skillsApi } from '../lib/api';
import { Skill, SkillType, SkillStatus, TrustLevel } from '@shared/types';
import { useToast } from '../hooks/useToast';

export default function SkillsPage() {
  const { show: showToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SkillType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SkillStatus | 'all'>('all');
  const [trustFilter, setTrustFilter] = useState<TrustLevel | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    version: '1.0.0',
    author: '',
    sourcePath: '',
    type: 'agent' as SkillType,
    status: 'discovered' as SkillStatus,
    tags: '',
    dependencies: '',
    entryPoint: '',
    schemaPath: '',
    trustLevel: 'untrusted' as TrustLevel,
  });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const res = await skillsApi.list();
      if (res.success) setSkills(res.data || []);
    } catch (e) {
      console.error('Failed to load skills:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesTrust = trustFilter === 'all' || s.trustLevel === trustFilter;
    return matchesSearch && matchesType && matchesStatus && matchesTrust;
  });

  const getTypeBadge = (type: SkillType) => `skill-type-${type}`;
  const getStatusBadge = (status: SkillStatus) => {
    const badges: Record<SkillStatus, string> = {
      discovered: 'badge-backlog',
      installed: 'badge-todo',
      enabled: 'badge-done',
      disabled: 'badge-backlog',
      deprecated: 'badge-low',
    };
    return badges[status];
  };
  const getTrustBadge = (trust: TrustLevel) => {
    const badges: Record<TrustLevel, string> = {
      untrusted: 'badge-low',
      community: 'badge-todo',
      verified: 'badge-done',
      official: 'badge-high',
    };
    return badges[trust];
  };

  const openCreateModal = () => {
    setEditingSkill(null);
    setFormData({ name: '', slug: '', description: '', version: '1.0.0', author: '', sourcePath: '', type: 'agent', status: 'discovered', tags: '', dependencies: '', entryPoint: '', schemaPath: '', trustLevel: 'untrusted' });
    setShowModal(true);
  };

  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      version: skill.version,
      author: skill.author || '',
      sourcePath: skill.sourcePath,
      type: skill.type,
      status: skill.status,
      tags: skill.tags.join(', '),
      dependencies: skill.dependencies.join(', '),
      entryPoint: skill.entryPoint || '',
      schemaPath: skill.schemaPath || '',
      trustLevel: skill.trustLevel,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSkill(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        version: formData.version,
        author: formData.author,
        sourcePath: formData.sourcePath,
        type: formData.type,
        status: formData.status,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        dependencies: formData.dependencies.split(',').map(t => t.trim()).filter(Boolean),
        entryPoint: formData.entryPoint,
        schemaPath: formData.schemaPath,
        trustLevel: formData.trustLevel,
        references: [],
        assets: [],
        scripts: [],
      };

      if (editingSkill) {
        const res = await skillsApi.update(editingSkill.id, data);
        if (res) { showToast('success', `Skill "${res.name}" updated`); closeModal(); loadSkills(); }
      } else {
        const res = await skillsApi.create(data);
        if (res) { showToast('success', `Skill "${res.name}" created`); closeModal(); loadSkills(); }
      }
    } catch (err) {
      showToast('error', String(err));
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    const res = await skillsApi.delete(skill.id);
    if (res.success) { showToast('success', 'Skill deleted'); loadSkills(); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Skills</h1>
          <p className="page-subtitle">Discover, manage, and compose reusable coding skills</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}><Plus size={14} /> New Skill</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-content" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-input" style={{ flex: 1, minWidth: 240, maxWidth: 400 }}>
              <Search size={16} />
              <input type="text" placeholder="Search skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: 40 }} />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as typeof typeFilter)} className="select"><option value="all">All Types</option><option value="agent">Agent</option><option value="workflow">Workflow</option><option value="utility">Utility</option><option value="template">Template</option></select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="select"><option value="all">All Statuses</option><option value="discovered">Discovered</option><option value="installed">Installed</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="deprecated">Deprecated</option></select>
            <select value={trustFilter} onChange={e => setTrustFilter(e.target.value as typeof trustFilter)} className="select"><option value="all">All Trust Levels</option><option value="untrusted">Untrusted</option><option value="community">Community</option><option value="verified">Verified</option><option value="official">Official</option></select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={32} className="loading-spinner" /></div>
      ) : filteredSkills.length === 0 ? (
        <div className="card"><div className="empty-state" style={{ padding: 60 }}><BookOpen size={64} /><h2 className="empty-state-title">No skills found</h2><p className="empty-state-description">Create or discover skills to extend your coding capabilities</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreateModal}><Plus size={16} /> Create Skill</button></div></div>
      ) : (
        <div className="skill-list" role="list" aria-label="Skills">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="skill-item" role="listitem">
              <div className="skill-icon"><BookOpen size={20} /></div>
              <div className="skill-info">
                <div className="skill-name-row">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-version">v{skill.version}</span>
                  <span className={`skill-type ${getTypeBadge(skill.type)}`}>{skill.type}</span>
                </div>
                {skill.description && <p className="skill-description">{skill.description}</p>}
                <div className="skill-meta">
                  <span><span className={`badge ${getStatusBadge(skill.status)}`}>{skill.status}</span></span>
                  <span><span className={`badge ${getTrustBadge(skill.trustLevel)}`}>{skill.trustLevel}</span></span>
                  <span>{skill.sourcePath}</span>
                </div>
              </div>
              <div className="skill-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(skill)} aria-label={`Edit ${skill.name}`}><ExternalLink size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(skill)} aria-label={`Delete ${skill.name}`}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="skill-modal-title">
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 id="skill-modal-title" className="modal-title">{editingSkill ? 'Edit Skill' : 'New Skill'}</h2><button className="modal-close" onClick={closeModal} aria-label="Close"><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label className="form-label">Name *</label><input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="form-input" placeholder="My Skill" required /></div>
                  <div className="form-group"><label className="form-label">Slug *</label><input value={formData.slug} onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))} className="form-input" placeholder="my-skill" required /></div>
                  <div className="form-group"><label className="form-label">Version</label><input value={formData.version} onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))} className="form-input" placeholder="1.0.0" /></div>
                  <div className="form-group"><label className="form-label">Type</label><select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as SkillType }))} className="form-input select"><option value="agent">Agent</option><option value="workflow">Workflow</option><option value="utility">Utility</option><option value="template">Template</option></select></div>
                  <div className="form-group"><label className="form-label">Status</label><select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as SkillStatus }))} className="form-input select"><option value="discovered">Discovered</option><option value="installed">Installed</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="deprecated">Deprecated</option></select></div>
                  <div className="form-group"><label className="form-label">Trust Level</label><select value={formData.trustLevel} onChange={e => setFormData(prev => ({ ...prev, trustLevel: e.target.value as TrustLevel }))} className="form-input select"><option value="untrusted">Untrusted</option><option value="community">Community</option><option value="verified">Verified</option><option value="official">Official</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="form-textarea" rows={3} /></div>
                <div className="form-group"><label className="form-label">Source Path *</label><input value={formData.sourcePath} onChange={e => setFormData(prev => ({ ...prev, sourcePath: e.target.value }))} className="form-input" placeholder="/path/to/skill" required /></div>
                <div className="form-group"><label className="form-label">Author</label><input value={formData.author} onChange={e => setFormData(prev => ({ ...prev, author: e.target.value }))} className="form-input" placeholder="Author name" /></div>
                <div className="form-group"><label className="form-label">Entry Point</label><input value={formData.entryPoint} onChange={e => setFormData(prev => ({ ...prev, entryPoint: e.target.value }))} className="form-input" placeholder="main.py or index.js" /></div>
                <div className="form-group"><label className="form-label">Schema Path</label><input value={formData.schemaPath} onChange={e => setFormData(prev => ({ ...prev, schemaPath: e.target.value }))} className="form-input" placeholder="schema.json" /></div>
                <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input value={formData.tags} onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))} className="form-input" placeholder="coding, automation, typescript" /></div>
                <div className="form-group"><label className="form-label">Dependencies (comma-separated skill slugs)</label><input value={formData.dependencies} onChange={e => setFormData(prev => ({ ...prev, dependencies: e.target.value }))} className="form-input" placeholder="other-skill, another-skill" /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-primary">{editingSkill ? 'Save Changes' : 'Create Skill'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}