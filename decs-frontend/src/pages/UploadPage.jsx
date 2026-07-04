import { useState, useRef } from 'react';
import { Upload, FileUp, CheckCircle2, Hash, AlertCircle, X, FileBox, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';

const FILE_TYPES = ['disk-image', 'mobile-extraction', 'network-capture', 'browser-data', 'log-archive', 'memory-dump', 'email-archive', 'database-dump', 'multimedia', 'other'];

export default function UploadPage({ onNavigate }) {
  const { uploadEvidence } = useApp();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', caseId: '', acquisitionDate: '', fileType: '' });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Evidence name is required';
    if (!form.caseId.trim()) errs.caseId = 'Case ID is required';
    if (!form.acquisitionDate) errs.acquisitionDate = 'Acquisition date is required';
    if (!form.fileType) errs.fileType = 'File type is required';
    if (!file) errs.file = 'Please select a file to upload';
    return errs;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length > 0) return;

    setUploading(true);
    try {
      const res = await uploadEvidence(form, file);
      // Backend returns { success, message, results: [{ file, evidence }] }
      const first = res.results?.[0];
      if (first?.error) {
        setServerError(`${first.file}: ${first.error}`);
      } else if (first?.evidence) {
        setResult({ evidence: first.evidence.evidence || first.evidence, hash: (first.evidence.evidence || first.evidence).hash });
      } else {
        setServerError('Upload completed but no evidence record was returned.');
      }
    } catch (err) {
      setServerError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setForm({ name: '', description: '', caseId: '', acquisitionDate: '', fileType: '' });
    setErrors({});
    setResult(null);
    setServerError('');
  };

  if (result) {
    const ev = result.evidence;
    return (
      <div className="page-content" style={{ maxWidth: 600 }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={28} color="var(--accent-green)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Evidence Uploaded Successfully
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
            The evidence has been securely stored and the SHA-256 hash has been recorded in the chain of custody.
          </p>

          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 16 }}>
              {[
                { label: 'Evidence ID', value: ev._id, mono: true },
                { label: 'Case ID', value: ev.caseId, mono: true },
                { label: 'File Name', value: ev.originalName || ev.fileName, mono: true },
                { label: 'File Size', value: ev.fileSizeFormatted || `${ev.fileSize} bytes` },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Hash size={12} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SHA-256 HASH</span>
              </div>
              <div className="hash-full" style={{ fontSize: '0.68rem' }}>{result.hash}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('evidence')}>
              <FileBox size={14} /> View Evidence
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              <Upload size={14} /> Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 700 }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Upload Evidence</h1>
          <p className="section-desc">Securely upload digital evidence. SHA-256 hash will be auto-generated.</p>
        </div>
      </div>

      {serverError && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* File upload zone */}
        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title"><FileUp size={15} /> Evidence File</span>
          </div>
          <div className="card-body">
            <div
              className={`upload-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <div className="upload-zone-icon">
                <Upload size={32} />
              </div>
              {file ? (
                <>
                  <div className="upload-zone-title" style={{ color: 'var(--accent-primary)' }}>{file.name}</div>
                  <div className="upload-zone-hint">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <X size={12} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="upload-zone-title">Drop evidence file here or click to browse</div>
                  <div className="upload-zone-hint">All file types accepted · Files stored encrypted</div>
                </>
              )}
            </div>
            <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            {errors.file && <div className="form-error mt-2"><AlertCircle size={12} style={{ display: 'inline' }} /> {errors.file}</div>}
          </div>
        </div>

        {/* Metadata */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Evidence Metadata</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Evidence Name <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. Suspect Laptop HDD Image" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Case ID <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. CASE-2026-001" value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))} />
                {errors.caseId && <div className="form-error">{errors.caseId}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">File Type <span className="required">*</span></label>
                <select className="form-select" value={form.fileType} onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}>
                  <option value="">Select type…</option>
                  {FILE_TYPES.map(t => <option key={t} value={t}>{t.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
                {errors.fileType && <div className="form-error">{errors.fileType}</div>}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Acquisition Date & Time <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 5 }} />
                  <input 
                    className="form-input" 
                    style={{ paddingLeft: 34 }}
                    type="datetime-local" 
                    value={form.acquisitionDate} 
                    onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))} 
                    onClick={e => {
                      try { e.target.showPicker(); } catch (err) {}
                    }}
                  />
                </div>
                {errors.acquisitionDate && <div className="form-error">{errors.acquisitionDate}</div>}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the evidence, acquisition method, and any relevant context…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <Hash size={14} style={{ flexShrink: 0 }} />
              An SHA-256 hash will be automatically generated for this file and permanently recorded in the chain of custody log.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary btn-lg" type="submit" disabled={uploading}>
                <Upload size={15} />
                {uploading ? 'Uploading & Hashing…' : 'Upload Evidence'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={reset}>Cancel</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
