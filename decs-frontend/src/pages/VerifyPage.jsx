import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Hash, Search, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatDate(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VerifyPage() {
  const { getEvidence, verifyIntegrity } = useApp();
  const [query, setQuery] = useState('');
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);
  const [results, setResults] = useState({});
  const [batchRunning, setBatchRunning] = useState(false);

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEvidence({ limit: 100 });
      setEvidenceList(data.evidence || []);
    } catch (err) {
      setError(err.message || 'Failed to load evidence.');
    } finally {
      setLoading(false);
    }
  }, [getEvidence]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const filtered = evidenceList.filter(e =>
    !query || e.name.toLowerCase().includes(query.toLowerCase()) || e.caseId.toLowerCase().includes(query.toLowerCase())
  );

  const handleVerify = async (ev) => {
    setVerifyingId(ev._id);
    try {
      const result = await verifyIntegrity(ev._id);
      setResults(prev => ({ ...prev, [ev._id]: result }));
      // Update local evidence status to reflect new integrityStatus
      setEvidenceList(prev => prev.map(e =>
        e._id === ev._id ? { ...e, integrityStatus: result.integrityStatus, integrityLastChecked: result.checkedAt } : e
      ));
    } catch (err) {
      setResults(prev => ({ ...prev, [ev._id]: { error: err.message } }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleBatchVerify = async () => {
    setBatchRunning(true);
    for (const ev of filtered) {
      await handleVerify(ev);
    }
    setBatchRunning(false);
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
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary mt-2" onClick={fetchEvidence}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section-header">
        <div>
          <h1 className="section-title">Verify Evidence Integrity</h1>
          <p className="section-desc">Re-calculate SHA-256 hashes and compare against stored values</p>
        </div>
        <button className="btn btn-success" onClick={handleBatchVerify} disabled={batchRunning || !!verifyingId}>
          <ShieldCheck size={14} />
          {batchRunning ? 'Verifying…' : `Batch Verify All (${filtered.length})`}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Filter by name or case ID…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evidence</th>
                <th>Case ID</th>
                <th>Last Verified</th>
                <th>Stored Hash (truncated)</th>
                <th>Integrity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => {
                const res = results[ev._id];
                const isVerifying = verifyingId === ev._id;
                return (
                  <tr key={ev._id}>
                    <td>
                      <div className="primary">{ev.name}</div>
                      <div className="text-xs text-muted">{ev.currentCustodian?.name}</div>
                    </td>
                    <td className="text-mono text-sm">{ev.caseId}</td>
                    <td className="text-sm text-secondary">{formatDate(ev.integrityLastChecked)}</td>
                    <td>
                      <span className="hash-text">{ev.hash.slice(0, 16)}…</span>
                    </td>
                    <td>
                      {res && !res.error ? (
                        <span className={`badge badge-${res.match ? 'intact' : 'compromised'}`}>
                          {res.match ? '✓ Intact' : '✗ Compromised'}
                        </span>
                      ) : (
                        <span className={`badge badge-${ev.integrityStatus}`}>{ev.integrityStatus}</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleVerify(ev)}
                        disabled={isVerifying || batchRunning}
                        style={{ minWidth: 110 }}
                      >
                        <ShieldCheck size={12} />
                        {isVerifying ? 'Verifying…' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><ShieldCheck size={24} /><div className="empty-state-title">No evidence to verify</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification results summary */}
      {Object.keys(results).length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title"><Hash size={15} /> Verification Results</span>
          </div>
          <div className="card-body">
            {Object.entries(results).map(([evId, res]) => {
              const ev = evidenceList.find(e => e._id === evId);
              if (!ev) return null;
              if (res.error) {
                return (
                  <div key={evId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                    <div className="alert alert-error" style={{ marginBottom: 0 }}>
                      <AlertTriangle size={15} /> {ev.name}: {res.error}
                    </div>
                  </div>
                );
              }
              return (
                <div key={evId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {res.match
                      ? <CheckCircle2 size={16} color="var(--accent-green)" />
                      : <AlertTriangle size={16} color="var(--accent-red)" />
                    }
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{ev.name}</span>
                    <span className={`badge badge-${res.match ? 'intact' : 'compromised'}`}>
                      {res.match ? 'INTACT' : 'COMPROMISED'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>STORED HASH</div>
                      <div className="hash-full" style={{ fontSize: '0.68rem' }}>{res.storedHash}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>CALCULATED HASH</div>
                      <div className="hash-full" style={{ fontSize: '0.68rem', color: res.match ? 'var(--accent-green)' : 'var(--accent-red)' }}>{res.calculatedHash}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
