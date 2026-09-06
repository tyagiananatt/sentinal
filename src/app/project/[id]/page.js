import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import AgentConnection from './AgentConnection';
import TesterGeneration from './TesterGeneration';
import TestExecution from './TestExecution';
import RootCauseAnalysis from './RootCauseAnalysis';
import AiUsageDetector from './AiUsageDetector';
import FutureRiskProfiler from './FutureRiskProfiler';

const prisma = new PrismaClient();

export default async function ProjectPage({ params }) {
  const { id } = await params;
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: { 
      profile: true,
      tester: true,
      requirements: { orderBy: { createdAt: 'asc' } },
      risks: { include: { requirement: true }, orderBy: { createdAt: 'asc' } }
    }
  });

  if (!project) return notFound();

  const profile = project.profile;

  return (
    <main style={{ maxWidth: '1000px', margin: '3rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <header style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Project Audit</span>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{profile?.title || 'Untitled Project'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={project.url} target="_blank" rel="noreferrer" className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 500 }}>
            <span style={{ marginRight: '0.5rem' }}>↗</span> Live URL
          </a>
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className="card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 500 }}>
            <span style={{ marginRight: '0.5rem' }}>↗</span> Repository
          </a>
        </div>
      </header>

      {profile ? (
        <section className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            System Architecture Profile
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div>
              <h4 style={{ color: 'var(--muted-text)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Type & Purpose</h4>
              <p style={{ wordBreak: 'break-word', fontWeight: 500, color: 'var(--foreground)' }}>{profile.type}</p>
              <p style={{ wordBreak: 'break-word', fontSize: '0.95rem' }}>{profile.purpose}</p>
            </div>
            
            <div>
              <h4 style={{ color: 'var(--muted-text)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Core Capabilities</h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {JSON.parse(profile.mainFeatures).map((f, i) => <li key={i} style={{ wordBreak: 'break-word' }}>{f}</li>)}
              </ul>
            </div>

            <div>
              <h4 style={{ color: 'var(--muted-text)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AI Subsystems</h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {JSON.parse(profile.aiComponents).map((f, i) => <li key={i} style={{ wordBreak: 'break-word' }}>{f}</li>)}
              </ul>
            </div>

          </div>
        </section>
      ) : (
        <div className="card animate-pulse-subtle">
          <p style={{ textAlign: 'center', margin: 0 }}>Profiling system architecture...</p>
        </div>
      )}

      {/* AI Usage Detector Module */}
      <AiUsageDetector projectId={id} />

      {/* Future Risk Profiler Module */}
      <FutureRiskProfiler projectId={id} />

      {/* Deep Connection Module */}
      <AgentConnection projectId={id} />

      {/* Tester Generation Module */}
      <TesterGeneration 
        projectId={id} 
        initialTester={project.tester}
        initialRequirements={project.requirements}
        initialRisks={project.risks}
      />

      {/* Test Execution Module */}
      {project.tester && (
        <TestExecution 
          projectId={id}
          initialTestSpecs={[]}
        />
      )}

      {/* Root Cause & Reporting Module */}
      {project.tester && (
        <RootCauseAnalysis projectId={id} />
      )}

    </main>
  );
}
