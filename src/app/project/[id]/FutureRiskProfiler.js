'use client';

import { useState } from 'react';

export default function FutureRiskProfiler({ projectId }) {
  const [timeframe, setTimeframe] = useState('6_months');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const predictRisks = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/predict-future-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, timeframe })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to predict risks');
      
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    }
    
    setLoading(false);
  };

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Future Risk Profiler
          </h2>
          <p style={{ margin: 0, color: 'var(--muted-text)', fontSize: '0.95rem' }}>
            Predict architectural degradation, tech-debt buildup, and scaling bottlenecks over time.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--surface-border)', fontSize: '0.9rem' }}
          >
            <option value="6_months">6 Months</option>
            <option value="12_months">12 Months</option>
            <option value="5_years">5 Years</option>
          </select>
          <button onClick={predictRisks} disabled={loading}>
            {loading ? <><span className="spinner"></span> Forecasting...</> : 'Predict Risks'}
          </button>
        </div>
      </div>

      {error && <div className="badge badge-danger" style={{ padding: '0.75rem', borderRadius: '6px', display: 'block', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textTransform: 'none' }}>{error}</div>}

      {report && (
        <div style={{ padding: '1.5rem', backgroundColor: '#000', borderRadius: '8px', border: '1px solid var(--primary)' }}>
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
