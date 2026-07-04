import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, Search, Loader2, Network } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TeamsPage() {
  const { getTeams, createTeam, updateTeam, deleteTeam, getUsers, getEvidence, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [teams, setTeams] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [evidenceCases, setEvidenceCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'delete', team: null }
  const [notification, setNotification] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamsData, usersData, evData] = await Promise.all([
        getTeams(),
        isAdmin ? getUsers({ role: 'investigator', status: 'active' }) : Promise.resolve({ users: [] }),
        isAdmin ? getEvidence({ limit: 100 }) : Promise.resolve({ evidence: [] }),
      ]);
      setTeams(teamsData.teams || []);
      setInvestigators(usersData.users || []);
      
      // Extract unique case IDs from evidence
      const cases = Array.from(new Set((evData.evidence || []).map(e => e.caseId))).sort();
      setEvidenceCases(cases);
    } catch (err) {
      setError(err.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }, [getTeams, getUsers, getEvidence, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateOrUpdate = async (caseId, selectedMembers) => {
    if (!caseId.trim()) throw new Error('Case ID is required');
    if (selectedMembers.length === 0) throw new Error('Please select at least one investigator');

    try {
      if (modal.type === 'edit') {
        await updateTeam(modal.team._id, { caseId, members: selectedMembers });
        showNotif('Team updated successfully');
      } else {
        await createTeam({ caseId, members: selectedMembers });
        showNotif('Team created successfully');
      }
      setModal(null);
      fetchData();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTeam(modal.team._id);
      showNotif('Team disbanded successfully');
      setModal(null);
      fetchData();
    } catch (err) {
      showNotif(err.message || 'Failed to disband team', 'error');
    }
  };

  const filtered = teams.filter(t => 
    !query || t.caseId.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading teams…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {notification && (
        <div className={`alert alert-${notification.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, maxWidth: 320 }}>
          <CheckCircle2 size={14} />
          {notification.msg}
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div className="section-header">
        <div>
          <h1 className="section-title">Case Teams</h1>
          <p className="section-desc">
            {isAdmin 
              ? 'Group investigators together to collaborate on the same forensic case'
              : 'Teams you are assigned to and your teammates working on those cases'
            }
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
            <Plus size={14} /> Create Team
          </button>
        )}
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <div className="search-bar" style={{ maxWidth: 320 }}>
            <Search size={14} color="var(--text-muted)" />
            <input 
              placeholder="Filter by Case ID…" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
            />
          </div>
        </div>
        
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Team Members</th>
                {isAdmin && <th>Created By</th>}
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(team => (
                <tr key={team._id}>
                  <td>
                    <span 
                      className="badge badge-secondary" 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.8rem', 
                        padding: '4px 10px',
                        background: 'rgba(0, 212, 255, 0.08)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(0, 212, 255, 0.2)'
                      }}
                    >
                      {team.caseId}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {team.members && team.members.map(member => {
                        const isSelf = member._id === currentUser._id;
                        return (
                          <div 
                            key={member._id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 6, 
                              background: isSelf ? 'rgba(0, 255, 157, 0.08)' : 'var(--bg-secondary)', 
                              border: `1px solid ${isSelf ? 'rgba(0, 255, 157, 0.2)' : 'var(--border)'}`,
                              borderRadius: 'var(--radius)', 
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              color: isSelf ? 'var(--accent-green)' : 'var(--text-primary)'
                            }}
                          >
                            <div style={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: '50%', 
                              background: isSelf ? 'var(--accent-green)' : 'var(--accent-purple)', 
                              color: 'var(--bg-primary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '0.55rem', 
                              fontWeight: 700 
                            }}>
                              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span>{member.name} {isSelf && '(you)'}</span>
                          </div>
                        );
                      })}
                      {(!team.members || team.members.length === 0) && (
                        <span className="text-muted text-xs">No members assigned</span>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="text-sm">
                      {team.createdBy?.name || 'System'}
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          title="Edit Members" 
                          onClick={() => setModal({ type: 'edit', team })}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          title="Disband Team" 
                          onClick={() => setModal({ type: 'delete', team })}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 2}>
                    <div className="empty-state">
                      <Network size={24} />
                      <div className="empty-state-title">No teams found</div>
                      <div className="empty-state-desc">
                        {isAdmin ? 'Click "Create Team" to form a new case team' : 'You are not assigned to any case teams yet.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Modal (Create / Edit) */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <TeamSaveModal 
          type={modal.type}
          team={modal.team}
          investigators={investigators}
          existingCases={evidenceCases}
          onClose={() => setModal(null)}
          onSave={handleCreateOrUpdate}
        />
      )}

      {/* Delete Modal */}
      {modal?.type === 'delete' && (
        <TeamDeleteModal 
          team={modal.team}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function TeamSaveModal({ type, team, investigators, existingCases, onClose, onSave }) {
  const [caseId, setCaseId] = useState(team ? team.caseId : '');
  const [selectedMembers, setSelectedMembers] = useState(team ? team.members.map(m => m._id) : []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave(caseId, selectedMembers);
    } catch (err) {
      setError(err.message || 'Failed to save team');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">{type === 'edit' ? 'Edit Case Team' : 'Create Case Team'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error mb-4">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Case ID <span className="required">*</span></label>
            <input 
              className="form-input text-mono" 
              placeholder="e.g. CASE-2026-X" 
              value={caseId} 
              onChange={e => setCaseId(e.target.value)}
              disabled={type === 'edit'}
              list="case-suggestions"
            />
            <datalist id="case-suggestions">
              {existingCases.map(c => <option key={c} value={c} />)}
            </datalist>
            <div className="form-hint">Uppercase alphanumeric code. Case teams link investigators together by Case ID.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Investigators <span className="required">*</span></label>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8, 
              maxHeight: 200, 
              overflowY: 'auto', 
              padding: 4, 
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-input)'
            }}>
              {investigators.map(inv => (
                <label key={inv._id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: selectedMembers.includes(inv._id) ? 'rgba(0, 212, 255, 0.04)' : 'transparent',
                }}>
                  <input 
                    type="checkbox" 
                    checked={selectedMembers.includes(inv._id)}
                    onChange={() => toggleMember(inv._id)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    background: 'var(--accent-purple)', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>
                    {inv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>{inv.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{inv.email}</div>
                  </div>
                </label>
              ))}
              {investigators.length === 0 && (
                <div className="text-muted text-xs p-2 text-center">No active investigators found</div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !caseId.trim() || selectedMembers.length === 0}>
            <CheckCircle2 size={14} /> {saving ? 'Saving…' : (type === 'edit' ? 'Save Changes' : 'Create Team')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamDeleteModal({ team, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Disband Case Team</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="alert alert-warning">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Are you sure you want to disband the team for case <strong>{team.caseId}</strong>? Members will lose shared access to teammate directories for this case. This action is logged.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            <Trash2 size={14} /> {deleting ? 'Disbanding…' : 'Disband Team'}
          </button>
        </div>
      </div>
    </div>
  );
}
