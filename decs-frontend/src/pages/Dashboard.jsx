import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { FileBox, Users, ShieldCheck, AlertTriangle, Clock, ArrowLeftRight, Upload, CheckCircle, Loader2 } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ onNavigate }) {
  const { currentUser, getEvidence, getUsers, getAuditLogs } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [evidenceList, setEvidenceList] = useState([]);
  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Evidence — available to both roles
      const evData = await getEvidence({ limit: 100 });
      setEvidenceList(evData.evidence || []);

      // Admin-only data — only fetch if the user is an admin
      if (isAdmin) {
        const [userData, auditData] = await Promise.all([
          getUsers(),
          getAuditLogs({ limit: 5 }),
        ]);
        setUsers(userData.users || []);
        setRecentActivity(auditData.logs || []);
      } else {
        // Investigators: no audit log access — leave recent activity empty
        // or derive something from their own evidence list if desired
        setRecentActivity([]);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [getEvidence, getUsers, getAuditLogs, isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = {
    total: evidenceList.length,
    active: evidenceList.filter(e => e.status === 'active').length,
    verified: evidenceList.filter(e => e.integrityStatus === 'intact').length,
    unverified: evidenceList.filter(e => e.integrityStatus === 'unverified').length,
    compromised: evidenceList.filter(e => e.integrityStatus === 'compromised').length,
    transferred: evidenceList.filter(e => e.status === 'transferred').length,
  };

  const actionIcon = (action) => {
    if (action === 'EVIDENCE_UPLOAD') return <Upload size={13} color="var(--accent-green)" />;
    if (action === 'CUSTODY_TRANSFER') return <ArrowLeftRight size={13} color="var(--accent-purple)" />;
    if (action === 'INTEGRITY_CHECK') return <CheckCircle size={13} color="var(--accent-primary)" />;
    return <Clock size={13} />;
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          {error}
        </div>
        <button className="btn btn-secondary mt-2" onClick={fetchAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            {isAdmin ? 'Administrator Dashboard' : 'Investigator Dashboard'}
          </h1>
          <p className="section-desc">
            Welcome back, {currentUser?.name} · Last login: {formatDate(currentUser?.lastLogin)}
          </p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
            <Upload size={14} /> Upload Evidence
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card accent-cyan">
          <div className="stat-label">Total Evidence</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-desc">{isAdmin ? 'System-wide' : 'Assigned to you'}</div>
        </div>
        <div className="stat-card accent-green">
          <div className="stat-label">Integrity Verified</div>
          <div className="stat-value">{stats.verified}</div>
          <div className="stat-desc">Hash matched</div>
        </div>
        <div className="stat-card accent-amber">
          <div className="stat-label">Pending Verification</div>
          <div className="stat-value">{stats.unverified}</div>
          <div className="stat-desc">Awaiting hash check</div>
        </div>
        {isAdmin && (
          <div className="stat-card accent-purple">
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{users.filter(u => u.status === 'active').length}</div>
            <div className="stat-desc">Registered accounts</div>
          </div>
        )}
        {stats.compromised > 0 && (
          <div className="stat-card accent-red">
            <div className="stat-label">Compromised</div>
            <div className="stat-value">{stats.compromised}</div>
            <div className="stat-desc">Integrity failed</div>
          </div>
        )}
      </div>

      {stats.compromised > 0 && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span><strong>Alert:</strong> {stats.compromised} evidence item(s) have failed integrity checks. Immediate review required.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Recent Evidence */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FileBox size={15} /> Recent Evidence</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('evidence')}>View all</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Case</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.slice(0, 5).map(ev => (
                  <tr key={ev._id}>
                    <td>
                      <div className="primary" style={{ fontSize: '0.82rem' }}>{ev.name}</div>
                      <div className="text-xs text-muted text-mono">{ev._id}</div>
                    </td>
                    <td className="text-mono text-sm">{ev.caseId}</td>
                    <td>
                      <span className={`badge badge-${ev.integrityStatus}`}>
                        {ev.integrityStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {evidenceList.length === 0 && (
                  <tr><td colSpan={3}><div className="empty-state" style={{ padding: '24px' }}>No evidence records</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity — Admin only */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Clock size={15} /> Recent Activity</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('audit')}>View all</button>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              {recentActivity.length === 0 ? (
                <div className="empty-state" style={{ padding: 16 }}>No recent activity</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentActivity.map(log => (
                    <div key={log._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {actionIcon(log.action)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {log.action.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.performedBy?.name || 'System'} · {timeAgo(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title"><Users size={15} /> User Overview</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('users')}>Manage users</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td className="primary">{u.name}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td><span className={`badge badge-${u.status === 'locked' ? 'compromised' : u.status}`}>{u.status}</span></td>
                    <td className="text-mono text-sm">{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
