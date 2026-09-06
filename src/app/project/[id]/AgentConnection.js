'use client';

import { useState, useEffect } from 'react';

export default function AgentConnection({ projectId }) {
  const [status, setStatus] = useState({ isConnected: false, session: null });
  const [loadingReq, setLoadingReq] = useState(false);
  const [host, setHost] = useState('');
  const [protocol, setProtocol] = useState('http:');
  const [customHost, setCustomHost] = useState('');

  useEffect(() => {
    let currentHost = window.location.host;
    setHost(currentHost);
    setProtocol(window.location.protocol);

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/project/${projectId}/agent-status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  const requestCapability = async (capability, reason) => {
    setLoadingReq(true);
    try {
      await fetch('/api/agent/request-capability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, capability, reason })
      });
    } catch (e) {
      console.error(e);
    }
    setLoadingReq(false);
  };

  return (
    <section className="card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        Deep Connection Engine
      </h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
        <div style={{ 
          width: '10px', height: '10px', borderRadius: '50%', 
          backgroundColor: status.isConnected ? 'var(--success)' : 'var(--danger)',
          boxShadow: status.isConnected ? '0 0 8px var(--success)' : 'none'
        }} />
        <span style={{ fontWeight: 600, letterSpacing: '0.025em' }}>
          {status.isConnected ? 'Sentinel Agent connected securely.' : 'Waiting for Sentinel Agent connection...'}
        </span>
      </div>

      {status.isConnected ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Secure WebSocket link established. Sentinel can now securely communicate with the target environment.
          </p>
          <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>Request Capabilities</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['inspect_runtime', 'inspect_tools', 'inspect_ai'].map(cap => (
              <button 
                key={cap} 
                onClick={() => requestCapability(cap, `Required to analyze ${cap.split('_')[1]}`)}
                disabled={loadingReq}
                style={{ backgroundColor: 'var(--surface-border)', color: 'var(--foreground)' }}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontWeight: 500, marginBottom: '1rem' }}>To connect a Target Machine to this Admin panel, run the following command on the target:</p>
          


          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted-text)', marginBottom: '0.5rem' }}>Admin Host Override (e.g. 192.168.0.100:3000)</label>
            <input 
              type="text" 
              placeholder={host} 
              value={customHost} 
              onChange={e => setCustomHost(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: '#000', border: '1px solid var(--surface-border)', color: 'var(--foreground)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ backgroundColor: '#000', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--surface-border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '-10px', left: '12px', backgroundColor: 'var(--surface)', padding: '0 8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--surface-border)', borderRadius: '4px' }}>Zero-Dependency Bootstrapper</span>
            <code style={{ color: 'var(--foreground)', userSelect: 'all', display: 'block', wordBreak: 'break-all', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              node -e "fetch('{protocol}//{customHost ? (customHost.includes(':') ? customHost : customHost + ':3000') : host}/api/bootstrapper/{projectId}').then(r=&gt;r.text()).then(t=&gt;eval(t))"
            </code>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', marginTop: '1rem' }}>
            This command will autonomously download the Agent, install its dependencies in a secure temp folder, and connect back to this UI.
          </p>
        </div>
      )}

      {status.session?.permissions?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Capability Requests</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {status.session.permissions.map(req => (
              <li key={req.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--surface-border)' }}>
                <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{req.capability}</strong> 
                <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'DENIED' ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: '0.5rem' }}>{req.status}</span>
                {req.result && (
                  <pre style={{ fontSize: '0.85rem', background: '#000', padding: '1rem', marginTop: '0.5rem', borderRadius: '6px', border: '1px solid var(--surface-border)', overflowX: 'auto' }}>
                    {JSON.stringify(JSON.parse(req.result), null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {status.session?.telemetry?.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem' }}>Live Telemetry</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {status.session.telemetry.map(t => (
              <li key={t.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--surface-border)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--primary)' }}>{t.type}</strong>: {t.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
