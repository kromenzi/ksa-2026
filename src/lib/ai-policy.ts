const EXTERNAL_AI_HOSTS = [
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.groq.com',
  'openrouter.ai',
];

export function isExternalAIUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return EXTERNAL_AI_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
}

export function assertLocalAIUrl(value: string): string {
  if (isExternalAIUrl(value)) throw new Error('External AI providers are disabled by Safety Board policy.');
  return value;
}
