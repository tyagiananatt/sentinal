'use client';

import { useState } from 'react';

export default function TesterGeneration({ projectId, initialTester, initialRequirements, initialRisks }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tester, setTester] = useState(initialTester);
  const [requirements, setRequirements] = useState(initialRequirements || []);
  const [risks, setRisks] = useState(initialRisks || []);

  const generateTester = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate tester');
      }
      
      // Reload the page to get the updated DB records
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (!tester) {
    return (
      <section className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          Threat Modeling Engine
        </h2>
        <p>This project has not been profiled for security risks and testing requirements yet.</p>
        <button 
          onClick={generateTester} 
          disabled={loading}
          style={{ marginTop: '1rem' }}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Generating Audit Profile...
            </>
          ) : 'Generate Audit Profile'}
        </button>
        {error && <div className="badge badge-danger" style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', display: 'block', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textTransform: 'none' }}>{error}</div>}
      </section>
    );
  }

  const getSeverityClass = (level) => {
    if (level === 'HIGH' || level === 'CRITICAL') return 'badge-danger';
    if (level === 'MEDIUM') return 'badge-warning';
    return 'badge-success';
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Tester Profile */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Audit Profile: {tester.name}
        </h2>
        <p style={{ wordBreak: 'break-word', fontWeight: 500, color: 'var(--foreground)' }}>{tester.purpose}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--muted-text)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Target Workflows</h4>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {JSON.parse(tester.targetWorkflows).map((w, i) => <li key={i} style={{ wordBreak: 'break-word' }}>{w}</li>)}
            </ul>
          </div>
          
          <div>
            <h4 style={{ color: 'var(--muted-text)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Audit Strategies</h4>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {JSON.parse(tester.strategies).map((s, i) => <li key={i} style={{ wordBreak: 'break-word' }}>{s}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Requirements */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Audit Requirements
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requirements.map(req => (
              <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--surface-border)', borderRadius: '6px', backgroundColor: 'var(--background)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '1rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{req.requirementId}</strong>
                  <span className={`badge ${getSeverityClass(req.criticality)}`}>{req.criticality}</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{req.description}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: 0, borderTop: '1px dashed var(--surface-border)', paddingTop: '0.5rem', wordBreak: 'break-word' }}>
                  <strong>Expected:</strong> {req.expected}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Identified Risks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {risks.map(risk => (
              <div key={risk.id} style={{ padding: '1rem', border: '1px solid var(--surface-border)', borderRadius: '6px', backgroundColor: 'var(--background)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '1rem' }}>
                  <span className="badge badge-primary" style={{ backgroundColor: 'var(--surface)' }}>{risk.type}</span>
                  <span className={`badge ${getSeverityClass(risk.severity)}`}>{risk.severity}</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', margin: 0, wordBreak: 'break-word' }}>{risk.description}</p>
                {risk.requirement && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: '0.5rem 0 0 0', fontFamily: 'monospace' }}>
                    Related: {risk.requirement.requirementId}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
