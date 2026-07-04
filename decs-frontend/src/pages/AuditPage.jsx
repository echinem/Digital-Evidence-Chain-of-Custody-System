import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, Filter, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ACTION_COLORS = {
  USER_LOGIN: { color: 'var(--accent-primary)', bg: 'rgba(0,212,255,0.08)' },
  USER_LOGOUT: { color: 'var(--text-muted)', bg: 'rgba(74,84,112,0.1)' },
  USER_LOGIN_FAILED: { color: 'var(--accent-red)', bg: 'rgba(255,59,92,0.08)' },
  USER_LOCKED: { color: 'var(--accent-red)', bg: 'rgba(255,59,92,0.08)' },
  USER_UNLOCK: { color: 'var(--accent-green)', bg: 'rgba(0,255,157,0.08)' },
  USER_CREATE: { color: 'var(--accent-green)', bg: 'rgba(0,255,157,0.08)' },
  USER_UPDATE: { color: 'var(--accent-amber)', bg: 'rgba(255,184,0,0.08)' },
  USER_DELETE: { color: 'var(--accent-red)', bg: 'rgba(255,59,92,0.08)' },
  EVIDENCE_UPLOAD: { color: 'var(--accent-green)', bg: 'rgba(0,255,157,0.08)' },
  EVIDENCE_VIEW: { color: 'var(--text-muted)', bg: 'rgba(74,84,112,0.1)' },
  CUSTODY_TRANSFER: { color: 'var(--accent-purple)', bg: 'rgba(168,85,247,0.08)' },
  INTEGRITY_CHECK: { color: 'var(--accent-primary)', bg: 'rgba(0,212,255,0.08)' },
  INTEGRITY_FAILED: { color: 'var(--accent-red)', bg: 'rgba(255,59,92,0.08)' },
  REPORT_GENERATED: { color: 'var(--accent-amber)', bg: 'rgba(255,184,0,0.08)' },
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditPage() {
  const { getAuditLogs } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (actionFilter !== 'all') params.action = actionFilter;
      const data = await getAuditLogs(params);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [getAuditLogs, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(log => {
    const userName = log.performedBy?.name || '';
    return !query || [log.details, log.action, userName].some(f => f.toLowerCase().includes(query.toLowerCase()));
  });

  const allActions = Object.keys(ACTION_COLORS);

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading audit log…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-2" onClick={fetchLogs}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section-header">
        <div>
          <h1 className="section-title">Audit Log</h1>
          <p className="section-desc">Immutable record of all system actions · {logs.length} event(s) loaded</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search actions, users, details…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={13} color="var(--text-muted)" />
            <select className="form-select" style={{ width: 'auto', padding: '6px 10px' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="all">All Actions</option>
              {allActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const style = ACTION_COLORS[log.action] || { color: 'var(--text-muted)', bg: 'transparent' };
                return (
                  <tr key={log._id}>
                    <td className="text-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: style.color,
                        background: style.bg,
                        letterSpacing: '0.03em',
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-sm">{log.performedBy?.name || '—'}</td>
                    <td className="text-sm" style={{ maxWidth: 360 }}>{log.details}</td>
                    <td className="text-mono text-xs text-muted">{log.ipAddress}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <ScrollText size={24} />
                      <div className="empty-state-title">No audit events found</div>
                      <div className="empty-state-desc">Try adjusting your search or filter</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Showing {filtered.length} of {logs.length} loaded events
          </div>
        )}
      </div>
    </div>
  );
}
