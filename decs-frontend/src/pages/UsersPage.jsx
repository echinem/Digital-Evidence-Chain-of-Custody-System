import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, Search, Unlock, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatDate(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user ? { name: user.name, email: user.email, role: user.role, password: '' } : { name: '', email: '', role: 'investigator', password: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (!user && !form.password) errs.password = 'Password is required';
    if (!user && form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.role) errs.role = 'Role is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save user.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{user ? 'Edit User' : 'Add New User'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {errors.submit && <div className="alert alert-error mb-4">{errors.submit}</div>}
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input className="form-input" placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address <span className="required">*</span></label>
            <input className="form-input" type="email" placeholder="user@decs.gov" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!user} />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Role <span className="required">*</span></label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="investigator">Investigator</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {!user && (
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input className="form-input" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              {errors.password && <div className="form-error">{errors.password}</div>}
              <div className="form-hint">Minimum 6 characters.</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <CheckCircle2 size={14} /> {saving ? 'Saving…' : (user ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ user, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Deactivate User</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="alert alert-warning">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            Are you sure you want to deactivate <strong>{user.name}</strong>? They will no longer be able to log in. This action is logged.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            <Trash2 size={14} /> {deleting ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { getUsers, createUser, updateUser, deleteUser, unlockUser, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // user id for unlock spinner

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [getUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = users.filter(u => {
    const matchQ = !query || [u.name, u.email].some(f => f.toLowerCase().includes(query.toLowerCase()));
    const matchR = roleFilter === 'all' || u.role === roleFilter;
    return matchQ && matchR;
  });

  const handleSave = async (form) => {
    if (modal.user) {
      await updateUser(modal.user._id, { name: form.name, role: form.role });
      showNotif('User updated successfully');
    } else {
      await createUser(form);
      showNotif('User created successfully');
    }
    setModal(null);
    fetchUsers();
  };

  const handleDelete = async () => {
    await deleteUser(modal.user._id);
    showNotif('User deactivated');
    setModal(null);
    fetchUsers();
  };

  const handleUnlock = async (u) => {
    setActionLoading(u._id);
    try {
      await unlockUser(u._id);
      showNotif(`${u.name}'s account unlocked`);
      fetchUsers();
    } catch (err) {
      showNotif(err.message || 'Failed to unlock account', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-2" onClick={fetchUsers}>Retry</button>
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

      <div className="section-header">
        <div>
          <h1 className="section-title">{isAdmin ? 'User Management' : 'My Teammates'}</h1>
          <p className="section-desc">
            {isAdmin
              ? `${users.length} registered accounts · ${users.filter(u => u.status === 'active').length} active`
              : `${users.filter(u => u._id !== currentUser._id).length} teammates on your case assignments`
            }
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
            <Plus size={14} /> Add New User
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          {isAdmin && (
            <select className="form-select" style={{ width: 'auto', padding: '6px 10px' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="investigator">Investigator</option>
            </select>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                {!isAdmin && <th>Assigned Cases</th>}
                {isAdmin && <th>Created</th>}
                {isAdmin && <th>Last Login</th>}
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'admin' ? 'var(--accent-primary)' : 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg-primary)', flexShrink: 0 }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="primary">{u.name}{u._id === currentUser._id && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}</span>
                    </div>
                  </td>
                  <td className="text-mono text-sm">{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td><span className={`badge badge-${u.status === 'locked' ? 'compromised' : u.status}`}>{u.status}</span></td>
                  {!isAdmin && (
                    <td className="text-sm">
                      {u.sharedCases && u.sharedCases.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {u.sharedCases.map(c => (
                            <span key={c} className="badge badge-secondary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(0, 212, 255, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {isAdmin && <td className="text-sm">{formatDate(u.createdAt)}</td>}
                  {isAdmin && <td className="text-sm">{formatDate(u.lastLogin)}</td>}
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => setModal({ type: 'edit', user: u })}
                          disabled={u._id === currentUser._id}>
                          <Edit2 size={12} />
                        </button>
                        {(u.status === 'locked' || u.status === 'inactive') && (
                          <button className="btn btn-success btn-sm" title="Unlock" onClick={() => handleUnlock(u)} disabled={actionLoading === u._id}>
                            <Unlock size={12} />
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" title="Deactivate" onClick={() => setModal({ type: 'delete', user: u })}
                          disabled={u._id === currentUser._id || u.status === 'inactive'}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={isAdmin ? 7 : 5}><div className="empty-state"><Users size={24} /><div className="empty-state-title">No users found</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === 'create' && <UserModal onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === 'edit' && <UserModal user={modal.user} onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === 'delete' && <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={handleDelete} />}
    </div>
  );
}
