import React, { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw, Monitor, Moon, Sun, Database, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { settingsApi, appStateApi } from '../lib/api';
import { Settings as SettingsType } from '@shared/types';
import { useToast } from '../hooks/useToast';

export default function SettingsPage() {
  const { theme, sidebarCollapsed, updateAppState, loadAppState } = useAppState();
  const { show: showToast } = useToast();
  const [settings, setSettings] = useState<SettingsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadAppState();
  }, [loadAppState]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.list();
      if (res.success) {
        setSettings(res.data || []);
        const edited: Record<string, string> = {};
        res.data?.forEach(s => { edited[s.key] = s.value; });
        setEditedSettings(edited);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const failures: string[] = [];

      for (const [key, value] of Object.entries(editedSettings)) {
        const existing = settings.find((setting) => setting.key === key);

        const result = await settingsApi.set(
            key,
            value,
            existing?.description,
            existing?.category,
            existing?.isSecret
        );

        if (!result.success) {
          failures.push(`${key}: ${result.error || 'Save failed'}`);
        }
      }

      if (failures.length > 0) {
        showToast('error', failures.join('; '));
        return;
      }

      await loadSettings();
      showToast('success', 'Settings saved');
    } catch (error) {
      showToast(
          'error',
          error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (
      newTheme: 'light' | 'dark' | 'system'
  ) => {
    try {
      await updateAppState({ theme: newTheme });
      showToast('success', `Theme set to ${newTheme}`);
    } catch (error) {
      showToast(
          'error',
          error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleSidebarToggle = async () => {
    try {
      await updateAppState({
        sidebarCollapsed: !sidebarCollapsed,
      });
    } catch (error) {
      showToast(
          'error',
          error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('This will delete ALL data (projects, tasks, skills, memory, activity). This cannot be undone. Are you sure?')) return;
    if (!window.confirm('Type "DELETE" to confirm:')) return;
    // In a real app, this would call a backend endpoint to wipe the database
    showToast('warning', 'Database reset not implemented in this demo');
  };

  const categories = [...new Set(settings.map(s => s.category))].sort();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure Coding Agentic OS preferences</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <section className="settings-section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="settings-section-title">Appearance</h2>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Theme</span>
            <span className="settings-label-desc">Choose color scheme</span>
          </div>
          <div className="settings-control" style={{ display: 'flex', gap: 8 }}>
            {['light', 'dark', 'system'].map(t => (
              <button
                key={t}
                className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleThemeChange(t as 'light' | 'dark' | 'system')}
                style={{ textTransform: 'capitalize' }}
              >
                {t === 'light' && <Sun size={14} />}
                {t === 'dark' && <Moon size={14} />}
                {t === 'system' && <Monitor size={14} />}
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Sidebar Collapsed</span>
            <span className="settings-label-desc">Keep navigation sidebar collapsed by default</span>
          </div>
          <div className="settings-control">
            <button
              className={`toggle ${sidebarCollapsed ? 'active' : ''}`}
              onClick={handleSidebarToggle}
              aria-pressed={sidebarCollapsed}
              aria-label="Toggle sidebar collapse"
            />
          </div>
        </div>
      </section>

      {categories.map(category => (
        <section key={category} className="settings-section" aria-labelledby={`settings-${category}-heading`}>
          <h2 id={`settings-${category}-heading`} className="settings-section-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h2>
          {settings.filter(s => s.category === category).map(setting => (
            <div key={setting.key} className="settings-row">
              <div className="settings-label">
                <span className="settings-label-text">{setting.key}</span>
                {setting.description && <span className="settings-label-desc">{setting.description}</span>}
              </div>
              <div className="settings-control" style={{ minWidth: 300 }}>
                {setting.isSecret ? (
                  <input
                    type="password"
                    value={editedSettings[setting.key] || setting.value}
                    onChange={e => setEditedSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <input
                    type="text"
                    value={editedSettings[setting.key] || setting.value}
                    onChange={e => setEditedSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <section className="settings-section" aria-labelledby="danger-zone-heading">
        <h2 id="danger-zone-heading" className="settings-section-title">Danger Zone</h2>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Reset Database</span>
            <span className="settings-label-desc">Permanently delete all projects, tasks, skills, memory, and activity</span>
          </div>
          <div className="settings-control">
            <button className="btn btn-danger" onClick={handleResetDb}>
              <Trash2 size={14} /> Reset All Data
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="about-heading">
        <h2 id="about-heading" className="settings-section-title">About</h2>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Version</span>
            <span className="settings-label-desc">Current application version</span>
          </div>
          <div className="settings-control">
            <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>0.1.0</code>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Database</span>
            <span className="settings-label-desc">SQLite database location</span>
          </div>
          <div className="settings-control">
            <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              %APPDATA%/Coding Agentic OS/coding-agentic-os.db
            </code>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">Backend API</span>
            <span className="settings-label-desc">Local REST API endpoint</span>
          </div>
          <div className="settings-control">
            <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>http://127.0.0.1:3456</code>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label">
            <span className="settings-label-text">WebSocket</span>
            <span className="settings-label-desc">Real-time updates endpoint</span>
          </div>
          <div className="settings-control">
            <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>ws://127.0.0.1:3457</code>
          </div>
        </div>
      </section>
    </div>
  );
}