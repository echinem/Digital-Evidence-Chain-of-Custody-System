import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertCircle, Search, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TransferPage() {
  const { getEvidence, getUsers, transferCustody, currentUser } = useApp();
  const [step, setStep] = useState(1); // 1: select evidence, 2: select recipient + reason, 3: confirm
  const [myEvidence, setMyEvidence] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedEv, setSelectedEv] = useState(null);
  const [toUser, setToUser] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [transferring, setTransferring] = useState(false);
  const [done, setDone] = useState(false);
  const [query, setQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [evData, userData] = await Promise.all([
        getEvidence({ limit: 100 }),
        getUsers({ role: 'investigator', status: 'active' }),
      ]);
      // Only evidence currently in my custody, not archived
      const mine = (evData.evidence || []).filter(
        e => e.currentCustodian?._id === currentUser._id && e.status !== 'archived'
      );
      setMyEvidence(mine);
      setInvestigators((userData.users || []).filter(u => u._id !== currentUser._id));
    } catch (err) {
      setError(err.message || 'Failed to load transfer data.');
    } finally {
      setLoading(false);
    }
  }, [getEvidence, getUsers, currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = myEvidence.filter(e =>
    !query || e.name.toLowerCase().includes(query.toLowerCase()) || e.caseId.toLowerCase().includes(query.toLowerCase())
  );

  const handleConfirm = async () => {
    if (!reason.trim()) { setErrors({ reason: 'Transfer reason is required' }); return; }
    setTransferring(true);
    setErrors({});
    try {
      await transferCustody(selectedEv._id, toUser, reason);
      setDone(true);
    } catch (err) {
      setErrors({ submit: err.message || 'Transfer failed.' });
    } finally {
      setTransferring(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedEv(null); setToUser(''); setReason(''); setErrors({}); setDone(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-2" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  if (done) {
    const recipient = investigators.find(u => u._id === toUser);
    return (
      <div className="page-content" style={{ maxWidth: 540 }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={28} color="var(--accent-purple)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Custody Transferred
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
            Evidence custody has been transferred to <strong>{recipient?.name}</strong>. A notification has been sent and the chain of custody log has been updated.
          </p>
          <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedEv.name}</strong> transferred from{' '}
              <strong>{currentUser.name}</strong> → <strong>{recipient?.name}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              Reason: {reason}
            </div>
          </div>
          <button className="btn btn-primary" onClick={reset}>Transfer Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 700 }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Transfer Custody</h1>
          <p className="section-desc">Transfer evidence custody to another investigator. All transfers are permanently logged.</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        {['Select Evidence', 'Choose Recipient', 'Confirm Transfer'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step > i + 1 ? 'var(--accent-green)' : step === i + 1 ? 'var(--accent-primary)' : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700,
              color: step >= i + 1 ? 'var(--bg-primary)' : 'var(--text-muted)',
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.8rem', color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>
              {label}
            </span>
            {i < 2 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Your Evidence</span>
            <div className="search-bar" style={{ maxWidth: 260 }}>
              <Search size={13} color="var(--text-muted)" />
              <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Case ID</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev._id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedEv(ev); setStep(2); }}>
                    <td>
                      <div className="primary">{ev.name}</div>
                      <div className="text-xs text-muted text-mono">{ev._id}</div>
                    </td>
                    <td className="text-mono text-sm">{ev.caseId}</td>
                    <td><span className={`badge badge-${ev.status}`}>{ev.status}</span></td>
                    <td><ArrowLeftRight size={13} color="var(--text-muted)" /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-title">No transferable evidence</div><div className="empty-state-desc">You have no evidence in your custody</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedEv && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Transfer Details</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
          </div>
          <div className="card-body">
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Transferring Evidence</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEv.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selectedEv._id} · {selectedEv.caseId}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Transfer To <span className="required">*</span></label>
              {investigators.length === 0 ? (
                <div className="alert alert-warning">No other active investigators available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {investigators.map(inv => (
                    <label key={inv._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      border: `1px solid ${toUser === inv._id ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      background: toUser === inv._id ? 'rgba(168,85,247,0.06)' : 'var(--bg-input)',
                    }}>
                      <input type="radio" name="recipient" value={inv._id} checked={toUser === inv._id} onChange={e => setToUser(e.target.value)} style={{ accentColor: 'var(--accent-purple)' }} />
                      <div style={{ width: 32, height: 32, background: 'var(--accent-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {inv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{inv.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{inv.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Transfer <span className="required">*</span></label>
              <textarea className="form-textarea" placeholder="Provide a reason for this custody transfer…" value={reason} onChange={e => setReason(e.target.value)} />
              {errors.reason && <div className="form-error"><AlertCircle size={12} style={{ display: 'inline' }} /> {errors.reason}</div>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => {
                if (!toUser) { setErrors({ toUser: 'Select a recipient' }); return; }
                setErrors({});
                setStep(3);
              }} disabled={!toUser}>
                Continue →
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && selectedEv && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Confirm Transfer</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>← Back</button>
          </div>
          <div className="card-body">
            {errors.submit && <div className="alert alert-error mb-4">{errors.submit}</div>}

            <div className="alert alert-warning mb-4">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              This action is permanent and will be recorded in the chain of custody log. Confirm to proceed.
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Evidence', value: selectedEv.name },
                { label: 'Case ID', value: selectedEv.caseId, mono: true },
                { label: 'From', value: currentUser.name },
                { label: 'To', value: investigators.find(u => u._id === toUser)?.name },
                { label: 'Reason', value: reason },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 80, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={transferring}>
                <ArrowLeftRight size={14} />
                {transferring ? 'Transferring…' : 'Confirm Transfer'}
              </button>
              <button className="btn btn-secondary" onClick={reset}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
