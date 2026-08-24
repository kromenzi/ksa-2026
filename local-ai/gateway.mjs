import http from 'node:http';

const PORT = Number(process.env.LOCAL_AI_PORT || 8787);
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const MAX_STEPS = Number(process.env.MAX_AGENT_STEPS || 10);
const RUNTIME_SHARED_TOKEN = String(process.env.RUNTIME_SHARED_TOKEN || '');

const graph = {
  context: 'Build context from internal Safety Board records.',
  safety: 'General safety reasoning and routing.',
  vision: 'Analyze locally supplied visual observations.',
  risk: 'Assess hazards and risk severity.',
  incident: 'Investigate incident causes and contributing factors.',
  ncr: 'Draft corrective action / NCR recommendations.',
  training: 'Recommend training and toolbox actions.',
  report: 'Generate management-ready report content.',
  approval: 'Review completeness and safety-critical output before publish.',
  dashboard: 'Prepare final structured dashboard result.',
};

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!RUNTIME_SHARED_TOKEN) return true;
  return req.headers.authorization === `Bearer ${RUNTIME_SHARED_TOKEN}`;
}

async function ollamaGenerate(prompt) {
  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false }),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`);
  return r.json();
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });
      try {
        const r = await fetch(`${OLLAMA_URL}/api/tags`);
        const data = await r.json();
        const found = Array.isArray(data.models) && data.models.some((m) => m.name === MODEL);
        return send(res, 200, { ok: true, mode: 'LOCAL-ONLY', model: MODEL, modelInstalled: found });
      } catch (error) {
        return send(res, 503, { ok: false, mode: 'LOCAL-ONLY', model: MODEL, error: String(error.message || error) });
      }
    }

    if (req.method !== 'POST' || req.url !== '/v1/safety/execute') return send(res, 404, { error: 'Not found' });
    if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });

    let raw = '';
    for await (const chunk of req) raw += chunk;
    const payload = JSON.parse(raw || '{}');
    const task = String(payload.task || '').trim();
    if (!task) return send(res, 400, { error: 'task is required' });

    const context = payload.context || {};
    const modules = Array.isArray(payload.modules) && payload.modules.length
      ? payload.modules.slice(0, MAX_STEPS)
      : ['context', 'safety', 'risk', 'report', 'approval'];

    const steps = [];
    let previous = '';

    for (const module of modules) {
      const role = graph[module] || module;
      const prompt = [
        'You are an internal Saudi industrial HSE AI agent running locally inside ABDULKAREM SAFETY BOARD.',
        'External AI providers are forbidden. Use only the supplied context and your internal reasoning.',
        'Do not invent site facts, standards, measurements, or events that are absent from context.',
        `Module: ${module}`,
        `Role: ${role}`,
        `Task: ${task}`,
        `Context JSON: ${JSON.stringify(context)}`,
        `Previous module output: ${previous}`,
        'Return concise JSON with keys: summary, findings, actions, risks, confidence.',
      ].join('\n');

      const result = await ollamaGenerate(prompt);
      previous = result.response || '';
      steps.push({ module, status: 'complete', output: previous });
    }

    return send(res, 200, { ok: true, mode: 'LOCAL-ONLY', model: MODEL, steps, final: previous });
  } catch (error) {
    return send(res, 500, { ok: false, error: String(error.message || error) });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Local Safety AI gateway listening on ${PORT}`));
