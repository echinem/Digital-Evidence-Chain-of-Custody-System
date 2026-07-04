import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ReportsPage() {
  const { generateReport, getEvidence } = useApp();
  const [params, setParams] = useState({ caseId: '', dateFrom: '', dateTo: '', reportType: 'full', evidenceStatus: 'all' });
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEvidence({ limit: 100 });
      const uniqueCases = Array.from(new Set((data.evidence || []).map(e => e.caseId))).sort();
      setCases(uniqueCases);
    } catch (err) {
      setError(err.message || 'Failed to load case IDs.');
    } finally {
      setLoading(false);
    }
  }, [getEvidence]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setSuccess(false);
    setError('');

    // Clean up params (e.g. status)
    const queryParams = { ...params };
    if (queryParams.evidenceStatus === 'all') {
      delete queryParams.evidenceStatus;
    }

    try {
      await generateReport(queryParams);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Report generation failed. No matching evidence records found or server error.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <Loader2 size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-title">Loading report criteria…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 700 }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Generate Report</h1>
          <p className="section-desc">Generate comprehensive forensic reports including evidence metadata and chain of custody logs.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          Report generated and downloaded successfully as a forensic-grade PDF document.
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <span className="card-title"><FileText size={15} /> Report Parameters</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Case ID Filter</label>
                <select 
                  className="form-select text-mono" 
                  value={params.caseId} 
                  onChange={e => setParams(p => ({ ...p, caseId: e.target.value }))}
                >
                  <option value="">All Registered Cases</option>
                  {cases.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="form-hint">Select a specific registered case ID or choose all cases.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select className="form-select" value={params.reportType} onChange={e => setParams(p => ({ ...p, reportType: e.target.value }))}>
                  <option value="full">Full Report (Evidence + Custody Chain)</option>
                  <option value="summary">Summary Report</option>
                  <option value="integrity">Integrity Report</option>
                  <option value="custody">Custody Chain Only</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Evidence Status</label>
                <select className="form-select" value={params.evidenceStatus} onChange={e => setParams(p => ({ ...p, evidenceStatus: e.target.value }))}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="transferred">Transferred</option>
                  <option value="verified">Verified</option>
                  <option value="archived">Archived</option>
                  <option value="compromised">Compromised</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date From</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 5 }} />
                  <input 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    type="date" 
                    value={params.dateFrom} 
                    onChange={e => setParams(p => ({ ...p, dateFrom: e.target.value }))} 
                    onClick={e => {
                      try { e.target.showPicker(); } catch (err) {}
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date To</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 5 }} />
                  <input 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    type="date" 
                    value={params.dateTo} 
                    onChange={e => setParams(p => ({ ...p, dateTo: e.target.value }))} 
                    onClick={e => {
                      try { e.target.showPicker(); } catch (err) {}
                    }}
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={generating} style={{ marginTop: 16 }}>
              <FileText size={15} />
              {generating ? 'Generating Forensic PDF…' : 'Generate & Download PDF'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
