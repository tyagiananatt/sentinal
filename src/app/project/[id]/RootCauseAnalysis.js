'use client';

import { useState } from 'react';

export default function RootCauseAnalysis({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const analyzeFindings = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/analyze-findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze findings');
      }
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <section className="card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        Root Cause Analysis & Final Report
      </h2>
      <p style={{ marginBottom: '1.5rem' }}>Analyze all failed test executions, investigate root causes via system architecture context, and generate a final security report.</p>
      
      <button 
        onClick={analyzeFindings} 
        disabled={loading}
      >
        {loading ? (
          <><span className="spinner"></span> Compiling Final Report...</>
        ) : 'Analyze Findings & Generate Report'}
      </button>
      
      {error && <div className="badge badge-danger" style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', display: 'block', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textTransform: 'none' }}>{error}</div>}

      {report && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
          <div 
            className="html-report-body" 
            dangerouslySetInnerHTML={{ __html: report }} 
            style={{ color: 'var(--foreground)', lineHeight: '1.6' }}
          />
        </div>
      )}
    </section>
  );
}
