import React, { useState } from 'react';
import { SAFETY_AGENT_EDGES, SAFETY_AGENT_GRAPH } from '@/lib/ai-agent-graph';
import { localAIHealth, runLocalAI } from '@/lib/local-ai-client';

const stages = [
  ['1', 'Context Engine', 'Build internal site and record context.'],
  ['2', 'Safety Agent', 'Coordinate safety reasoning and routing.'],
  ['3', 'Vision Agent', 'Analyze local visual observations.'],
  ['4', 'Risk Assessment Agent', 'Evaluate hazard and risk severity.'],
  ['5', 'Incident Investigation Agent', 'Investigate causes and contributing factors.'],
  ['6', 'NCR Agent', 'Create corrective-action workflow.'],
  ['7', 'Training Agent', 'Create training and toolbox actions.'],
  ['8', 'Report Agent', 'Prepare management-ready output.'],
  ['9', 'Approval / Review Loop', 'Validate before publication.'],
  ['10', 'Dashboard', 'Publish approved result to Safety Board.'],
] as const;

export default function AdminAIEngine() {
  const [health, setHealth] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const checkHealth = async () => {
    try { setHealth(await localAIHealth()); }
    catch (error) { setHealth({ ok: false, error: String(error) }); }
  };

  const runDemo = async () => {
    setRunning(true);
    try {
      setResult(await runLocalAI({
        task: 'Analyze a sample factory safety observation and propose the next HSE actions.',
        context: {
          site: 'MV/LV Factory',
          source: 'Safety Board demo',
          observation: 'Combustible waste accumulated near an electrical work area.',
        },
      }));
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Safety AI Agent Platform</h1>
        <p className="text-sm text-muted-foreground">Local-only AI orchestration for the complete HSE workflow.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg border px-4 py-2" onClick={checkHealth}>Check Local AI</button>
        <button className="rounded-lg border px-4 py-2" onClick={runDemo} disabled={running}>{running ? 'Running…' : 'Run Safety AI Test'}</button>
        <span className="rounded-full border px-3 py-2 text-xs">LOCAL-ONLY</span>
        {health && <span className="rounded-full border px-3 py-2 text-xs">{health.ok ? `READY · ${health.model}` : 'OFFLINE'}</span>}
      </div>

      <section className="rounded-2xl border p-5">
        <h2 className="font-semibold">End-to-End Safety Workflow</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {stages.map(([n, title, description]) => (
            <div key={n} className="rounded-xl border p-4">
              <div className="text-xs opacity-60">{n}</div>
              <div className="mt-1 font-medium">{title}</div>
              <div className="mt-2 text-xs text-muted-foreground">{description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="font-semibold">Agent Graph</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SAFETY_AGENT_GRAPH.map((agent) => (
            <div key={agent.key} className="rounded-xl border p-4">
              <div className="font-medium">{agent.role}</div>
              <div className="mt-1 text-xs text-muted-foreground">{agent.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          {SAFETY_AGENT_EDGES.map(([a, b]) => `${a} → ${b}`).join(' · ')}
        </div>
      </section>

      {result && (
        <section className="rounded-2xl border p-5">
          <h2 className="font-semibold">Latest Local Run</h2>
          <pre className="mt-4 overflow-auto rounded-xl bg-muted p-4 text-xs">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
