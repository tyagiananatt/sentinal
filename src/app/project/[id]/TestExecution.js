'use client';

import { useState, useEffect } from 'react';

export default function TestExecution({ projectId, initialTestSpecs }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  
  // Deep Testing States
  const [instruction, setInstruction] = useState('');
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepResult, setDeepResult] = useState(null);
  const [deepError, setDeepError] = useState(null);
  const [simplifiedResult, setSimplifiedResult] = useState(null);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (projectId) {
      setCategoriesLoading(true);
      fetch('/api/suggest-deep-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      .then(res => res.json().then(data => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch suggestions');
        }
        if (data.categories) setCategories(data.categories);
        setCategoriesLoading(false);
      })
      .catch(err => {
        console.error("Failed to load categories:", err);
        setDeepError("AI Suggestion Error: " + err.message);
        setCategoriesLoading(false);
      });
    }
  }, [projectId]);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/execute-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute tests');
      }
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const runDeepTest = async (overrideInstruction = null) => {
    const finalInstruction = overrideInstruction || instruction;
    if (!finalInstruction) return;
    
    if (overrideInstruction) {
      setInstruction(overrideInstruction);
    }

    setDeepLoading(true);
    setDeepError(null);
    setDeepResult(null);
    setSimplifiedResult(null);
    setShowSimplified(false);

    try {
      const res = await fetch('/api/execute-agent-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, instruction: finalInstruction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deep test failed');
      
      setDeepResult(data.result);
    } catch (e) {
      setDeepError(e.message);
    }
    setDeepLoading(false);
  };

  const handleSimplify = async () => {
    if (simplifiedResult) {
      setShowSimplified(!showSimplified);
      return;
    }
    setIsSimplifying(true);
    try {
      const res = await fetch('/api/simplify-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: deepResult })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to simplify report');
      setSimplifiedResult(data.simplified);
      setShowSimplified(true);
    } catch (e) {
      setDeepError(e.message);
    }
    setIsSimplifying(false);
  };

  return (
    <section className="card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
        Dynamic Test Execution
      </h2>
      <p style={{ marginBottom: '1.5rem' }}>Execute the generated testing strategy dynamically against the live application architecture.</p>
      
      <button 
        onClick={runTests} 
        disabled={loading}
      >
        {loading ? (
          <><span className="spinner"></span> Attacking Target...</>
        ) : 'Run Automated Tests'}
      </button>
      
      {error && <div className="badge badge-danger" style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', display: 'block', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textTransform: 'none' }}>{error}</div>}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Execution Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '1rem', border: '1px solid var(--surface-border)', borderRadius: '6px', backgroundColor: 'var(--background)', borderLeft: `4px solid ${r.execution.status === 'PASSED' ? 'var(--success)' : 'var(--danger)'}` }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--foreground)' }}>{r.spec.objective}</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-text)', marginBottom: '1rem' }}>
                  <strong>Scenario:</strong> {r.spec.inputScenario} <br/>
                  <strong>Expected:</strong> {r.spec.expected}
                </div>
                <div style={{ fontSize: '0.9rem', backgroundColor: '#000', padding: '1rem', borderRadius: '6px', overflowX: 'auto', border: '1px solid var(--surface-border)' }}>
                  <span className={`badge ${r.execution.status === 'PASSED' ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: '0.5rem' }}>
                    {r.execution.status}
                  </span> 
                  <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--muted-text)' }}>
                    {r.execution.actualOutput}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep Interactive Testing Section */}
      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          Deep Agent-Driven Execution
        </h3>
        <p style={{ marginBottom: '1.5rem' }}>Instruct the Sentinel Agent to perform a specific terminal-level check (e.g. "Run npm audit to check for security vulnerabilities").</p>
        
        {categoriesLoading && (
          <div style={{ padding: '2rem', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--muted-text)' }}>
            <span className="spinner spinner-primary"></span>
            Mapping execution domains for project...
          </div>
        )}

        {/* Drill-down Categories */}
        {!deepLoading && !deepResult && categories.length > 0 && !categoriesLoading && (
          <div style={{ backgroundColor: 'var(--background)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
            {!selectedCategory ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--foreground)' }}>Select an execution domain:</h4>
                  <button 
                    onClick={() => {
                      setCategoriesLoading(true);
                      setDeepError(null);
                      fetch('/api/suggest-deep-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) })
                        .then(res => res.json().then(data => ({ res, data })))
                        .then(({ res, data }) => { 
                          if (!res.ok) throw new Error(data.error || 'Failed');
                          if (data.categories) setCategories(data.categories); 
                          setCategoriesLoading(false); 
                        })
                        .catch((err) => {
                          setDeepError("AI Suggestion Error: " + err.message);
                          setCategoriesLoading(false);
                        });
                    }}
                    style={{ background: 'transparent', color: 'var(--primary)', boxShadow: 'none', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    Refresh Ideas
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {categories.map((cat, i) => (
                    <button 
                      key={i}
                      onClick={() => setSelectedCategory(cat)}
                      title={cat.description}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => setSelectedCategory(null)} style={{ background: 'transparent', color: 'var(--muted-text)', padding: 0, border: 'none' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </button>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>{selectedCategory.name} Procedures</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedCategory.subOptions.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => runDeepTest(opt)}
                      style={{ padding: '1rem', textAlign: 'left', borderRadius: '6px', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--surface-border)', justifyContent: 'flex-start', boxShadow: 'none' }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runDeepTest()}
            placeholder="Or type a custom execution instruction..."
            style={{ flex: '1 1 300px' }}
          />
          <button 
            onClick={() => runDeepTest()} 
            disabled={deepLoading || !instruction}
            style={{ flex: '0 0 auto' }}
          >
            {deepLoading ? <><span className="spinner"></span> Executing...</> : 'Send Instruction'}
          </button>
        </div>

        {deepError && <div className="badge badge-danger" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '6px', display: 'block', fontSize: '0.95rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textTransform: 'none' }}><strong>Execution Error:</strong> {deepError}</div>}

        {/* Final Result */}
        {deepResult && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#000', borderRadius: '8px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Execution Report
              </h4>
              <button 
                onClick={handleSimplify}
                disabled={isSimplifying}
                style={{ background: 'transparent', border: '1px solid var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                {isSimplifying ? 'Simplifying...' : (showSimplified ? 'Show Technical View' : 'Explain in Simple Terms')}
              </button>
            </div>
            <div className="html-report-body" style={{ color: 'var(--foreground)', lineHeight: '1.6' }}>
              <div dangerouslySetInnerHTML={{ __html: showSimplified ? simplifiedResult : deepResult }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
