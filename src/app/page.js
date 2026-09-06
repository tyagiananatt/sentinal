'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.target);
    const url = formData.get('url');
    const github = formData.get('github');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, github })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze project');
      }
      
      const data = await response.json();
      router.push(`/project/${data.projectId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.05em', color: 'var(--foreground)', marginBottom: '0.5rem' }}>SENTINEL</h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '1.1rem' }}>
          Enterprise Security & Architecture Auditor
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted-text)' }}>
              LIVE PROJECT URL
            </label>
            <input 
              type="url" 
              name="url" 
              placeholder="https://your-project.com" 
              required 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--muted-text)' }}>
              GITHUB REPOSITORY
            </label>
            <input 
              type="url" 
              name="github" 
              placeholder="https://github.com/user/repo" 
              required 
            />
          </div>
          
          {error && (
            <div className="badge badge-danger" style={{ display: 'flex', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--danger-muted)' }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '1rem', width: '100%', padding: '1rem' }}
          >
            {loading ? (
              <>
                <span className="spinner spinner-primary" style={{ borderTopColor: 'white' }}></span>
                INITIALIZING AUDIT...
              </>
            ) : (
              'BEGIN AUDIT'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
