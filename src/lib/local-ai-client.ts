import { assertLocalAIUrl } from './ai-policy';

const LOCAL_AI_URL = assertLocalAIUrl(import.meta.env.VITE_LOCAL_AI_URL || 'http://localhost:8787');

export async function localAIHealth() {
  const response = await fetch(`${LOCAL_AI_URL}/health`, { credentials: 'omit' });
  return response.json();
}

export async function runLocalAI(input: {
  task: string;
  context?: Record<string, unknown>;
  model?: string;
}) {
  const response = await fetch(`${LOCAL_AI_URL}/v1/safety/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
