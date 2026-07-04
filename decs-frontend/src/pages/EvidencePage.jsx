import { useState, useEffect, useCallback } from 'react';
import { FileBox, Search, Filter, ChevronRight, Hash, Clock, ShieldCheck, ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_OPTIONS = ['all', 'active', 'transferred', 'verified', 'archived', 'compromised'];

function EvidenceDetail({ evidenceId, onBack }) {
  const { getEvidenceById, verifyIntegrity } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getEvidenceById(evidenceId);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load evidence details.');
    } finally {
      setLoading(false);
    }
  }, [evidenceId, getEvidenceById]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyIntegrity(evidenceId);
      setVerifyResult(result);
      await fetchDetail(); // refresh evidence status after verification
    } catch (err) {
      setVerifyResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const actionClass = (action) => {
    if (action === 'uploaded') return 'ev-upload';
    if (action === 'transferred') return 'ev-transferred';
    if (action === 'verified' || action === 'integrity_failed') return 'ev-verified';
    return '';
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading evidence…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <button className="btn btn-ghost btn-sm mb-4" onClick={onBack}><ArrowLeft size={13} /> Back to Evidence</button>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const { evidence: ev, custodyLogs } = data;

  return (
    <div className="page-content">
      <button className="btn btn-ghost btn-sm mb-4" onClick={onBack}>
        <ArrowLeft size={13} /> Back to Evidence
      </button>

      <div className="section-header">
        <div>
          <h1 className="section-title">{ev.name}</h1>
          <p className="section-desc text-mono">{ev._id} · Case: {ev.caseId}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge badge-${ev.status}`}>{ev.status}</span>
          <span className={`badge badge-${ev.integrityStatus}`}>{ev.integrityStatus}</span>
        </div>
      </div>

      {verifyResult && !verifyResult.error && (
        <div className={`alert ${verifyResult.match ? 'alert-success' : 'alert-error'} mb-4`}>
          {verifyResult.match
            ? <><CheckCircle2 size={15} /> Evidence integrity verified — SHA-256 hashes match.</>
            : <><AlertTriangle size={15} /> Integrity COMPROMISED — hashes do not match. This evidence may have been tampered with.</>
          }
        </div>
      )}
      {verifyResult?.error && (
        <div className="alert alert-error mb-4">{verifyResult.error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Metadata */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FileBox size={15} /> Evidence Details</span>
          </div>
          <div className="card-body">
            {[
              { label: 'Description', value: ev.description || '—' },
              { label: 'File Name', value: ev.originalName || ev.fileName, mono: true },
              { label: 'File Type', value: ev.fileType },
              { label: 'File Size', value: ev.fileSizeFormatted || `${ev.fileSize} bytes` },
              { label: 'Acquisition Date', value: formatDate(ev.acquisitionDate) },
              { label: 'Uploaded At', value: formatDate(ev.createdAt) },
              { label: 'Uploaded By', value: ev.uploadedBy?.name || '—' },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 16 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</span>
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 6 }}>Current Custodian</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, background: 'var(--accent-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'white' }}>
                  {ev.currentCustodian?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '—'}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{ev.currentCustodian?.name || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hash / Integrity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Hash size={15} /> Integrity & Hash</span>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>SHA-256 Hash</div>
              <div className="hash-full">{ev.hash}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="text-muted text-xs text-mono">Integrity Status</span>
              <span className={`badge badge-${ev.integrityStatus}`}>{ev.integrityStatus}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="text-muted text-xs text-mono">Last Checked</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{formatDate(ev.integrityLastChecked)}</span>
            </div>
            <button className="btn btn-success w-full" style={{ justifyContent: 'center' }} onClick={handleVerify} disabled={verifying}>
              <ShieldCheck size={14} />
              {verifying ? 'Calculating SHA-256…' : 'Verify Integrity Now'}
            </button>
            {verifyResult && !verifyResult.error && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Recalculated Hash</div>
                <div className="hash-full" style={{ fontSize: '0.68rem', color: verifyResult.match ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {verifyResult.calculatedHash}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custody Timeline */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Clock size={15} /> Chain of Custody</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{custodyLogs.length} event(s)</span>
        </div>
        <div className="card-body">
          {custodyLogs.length === 0 ? (
            <div className="empty-state"><p>No custody log events</p></div>
          ) : (
            <div className="custody-timeline">
              {custodyLogs.map(log => (
                <div key={log._id} className={`custody-event ${actionClass(log.action)}`}>
                  <div className="custody-event-time">{formatDate(log.createdAt)}</div>
                  <div className="custody-event-action">
                    {log.action === 'uploaded' && 'Evidence Uploaded'}
                    {log.action === 'transferred' && `Custody Transferred: ${log.fromUser?.name || '—'} → ${log.toUser?.name || '—'}`}
                    {log.action === 'verified' && 'Integrity Verified'}
                    {log.action === 'integrity_failed' && 'Integrity Check FAILED'}
                  </div>
                  <div className="custody-event-detail">{log.reason}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    By: {log.performedBy?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const { getEvidence } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (query) params.search = query;
      if (statusFilter !== 'all') {
        // status filter may target either 'status' or 'integrityStatus'
        if (['intact', 'unverified', 'compromised'].includes(statusFilter)) {
          params.integrityStatus = statusFilter;
        } else {
          params.status = statusFilter;
        }
      }
      const data = await getEvidence(params);
      setEvidenceList(data.evidence || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load evidence.');
    } finally {
      setLoading(false);
    }
  }, [getEvidence, query, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEvidence, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchEvidence]);

  if (selectedId) {
    return <EvidenceDetail evidenceId={selectedId} onBack={() => { setSelectedId(null); fetchEvidence(); }} />;
  }

  return (
    <div className="page-content">
      <div className="section-header">
        <div>
          <h1 className="section-title">Evidence Records</h1>
          <p className="section-desc">{total} item(s) total</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ maxWidth: 320 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search by name, case ID…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={13} color="var(--text-muted)" />
            <select className="form-select" style={{ width: 'auto', padding: '6px 10px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '16px 22px' }}>{error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evidence</th>
                <th>Case ID</th>
                <th>File Type</th>
                <th>Size</th>
                <th>Custodian</th>
                <th>Status</th>
                <th>Integrity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="empty-state"><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /><div className="empty-state-title">Loading…</div></div></td></tr>
              ) : evidenceList.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <FileBox size={28} />
                      <div className="empty-state-title">No evidence found</div>
                      <div className="empty-state-desc">Try adjusting your search or filters</div>
                    </div>
                  </td>
                </tr>
              ) : evidenceList.map(ev => (
                <tr key={ev._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(ev._id)}>
                  <td>
                    <div className="primary">{ev.name}</div>
                    <div className="text-xs text-muted text-mono">{ev._id}</div>
                  </td>
                  <td className="text-mono text-sm">{ev.caseId}</td>
                  <td className="text-sm">{ev.fileType}</td>
                  <td className="text-mono text-sm">{ev.fileSizeFormatted || `${ev.fileSize} B`}</td>
                  <td className="text-sm">{ev.currentCustodian?.name || '—'}</td>
                  <td><span className={`badge badge-${ev.status}`}>{ev.status}</span></td>
                  <td><span className={`badge badge-${ev.integrityStatus}`}>{ev.integrityStatus}</span></td>
                  <td><ChevronRight size={14} color="var(--text-muted)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
