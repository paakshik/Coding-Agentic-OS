import React, { useEffect, useState } from 'react';
import { GitBranch, Search, RefreshCw, FileText, Minus, Plus, Copy, X, ChevronDown } from 'lucide-react';
import { useCurrentProject } from '../hooks/useAppState';
import { gitApi } from '../lib/api';
import { useToast } from '../hooks/useToast';

export default function CodeReviewPage() {
  const currentProject = useCurrentProject();
  const { show: showToast } = useToast();
  const [gitStatus, setGitStatus] = useState<string>('');
  const [gitDiff, setGitDiff] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadGitStatus();
    }
  }, [currentProject]);

  const loadGitStatus = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await gitApi.status(currentProject.id);
      if (res.success) {
        setGitStatus(res.data.status);
        const fileList = res.data.status.split('\n').filter(Boolean).map(line => line.slice(3).trim());
        setFiles(fileList);
        if (fileList.length > 0 && !selectedFile) {
          setSelectedFile(fileList[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load git status:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDiff = async (file?: string) => {
    if (!currentProject) return;
    setDiffLoading(true);
    try {
      const res = await gitApi.diff(currentProject.id, file);
      if (res.success) setGitDiff(res.data.diff);
    } catch (e) {
      console.error('Failed to load diff:', e);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleFileChange = (file: string) => {
    setSelectedFile(file);
    loadDiff(file);
  };

  const copyDiff = () => {
    navigator.clipboard.writeText(gitDiff);
    showToast('success', 'Diff copied to clipboard');
  };

  if (!currentProject) {
    return (
      <div className="page">
        <div className="empty-state" style={{ flex: 1 }}>
          <GitBranch size={64} />
          <h2 className="empty-state-title">Select a Project</h2>
          <p className="empty-state-description">Choose a project from the header to review code changes</p>
        </div>
      </div>
    );
  }

  const hasChanges = gitStatus.trim().length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Code Review</h1>
          <p className="page-subtitle">Git changes for <strong>{currentProject.name}</strong></p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadGitStatus} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 'calc(100% - 80px)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2 className="card-title">Changed Files</h2>
            <button className="btn btn-ghost btn-sm" onClick={loadGitStatus} disabled={loading}>
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="card-content" style={{ padding: 0, flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center' }}><RefreshCw size={24} className="loading-spinner" /></div>
            ) : !hasChanges ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <GitBranch size={32} />
                <p className="empty-state-title">No changes</p>
                <p className="empty-state-description">Working tree is clean</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none' }}>
                {files.map(file => (
                  <li key={file} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <button
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: selectedFile === file ? 'rgba(88, 166, 255, 0.1)' : 'transparent', border: 'none', color: selectedFile === file ? 'var(--accent-blue)' : 'var(--text-primary)', cursor: 'pointer' }}
                      onClick={() => handleFileChange(file)}
                    >
                      <FileText size={16} />
                      <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2 className="card-title">Diff: {selectedFile || 'Select a file'}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedFile && (
                <button className="btn btn-ghost btn-sm" onClick={copyDiff}><Copy size={14} /> Copy</button>
              )}
            </div>
          </div>
          <div className="card-content" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
            {diffLoading ? (
              <div style={{ padding: 32, textAlign: 'center' }}><RefreshCw size={24} className="loading-spinner" /></div>
            ) : !selectedFile ? (
              <div className="empty-state" style={{ padding: 32, height: '100%' }}>
                <FileText size={32} />
                <p className="empty-state-title">Select a file</p>
                <p className="empty-state-description">Choose a file from the list to view its diff</p>
              </div>
            ) : !gitDiff.trim() ? (
              <div className="empty-state" style={{ padding: 32, height: '100%' }}>
                <GitBranch size={32} />
                <p className="empty-state-title">No diff available</p>
                <p className="empty-state-description">This file may be new or have no changes</p>
              </div>
            ) : (
              <pre style={{
                margin: 0,
                padding: 16,
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)',
                height: '100%',
                overflow: 'auto'
              }}>
                {gitDiff.split('\n').map((line, i) => (
                  <div key={i} style={{
                    color: line.startsWith('+') ? 'var(--accent-green)' :
                           line.startsWith('-') ? 'var(--accent-red)' :
                           line.startsWith('@@') ? 'var(--accent-yellow)' :
                           line.startsWith('diff') || line.startsWith('index') ? 'var(--accent-blue)' :
                           'var(--text-secondary)'
                  }}>
                    {line}
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}