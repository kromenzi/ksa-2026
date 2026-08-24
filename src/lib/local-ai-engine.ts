export type SafetyAIModule =
  | 'context'
  | 'safety'
  | 'vision'
  | 'risk'
  | 'incident'
  | 'ncr'
  | 'training'
  | 'report'
  | 'approval'
  | 'dashboard';

export interface SafetyAIRequest {
  task: string;
  context?: Record<string, unknown>;
  modules?: SafetyAIModule[];
  maxSteps?: number;
}

export interface SafetyAIStep {
  module: SafetyAIModule;
  status: 'pending' | 'running' | 'complete' | 'blocked';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

const DEFAULT_FLOW: SafetyAIModule[] = [
  'context',
  'safety',
  'vision',
  'risk',
  'incident',
  'ncr',
  'training',
  'report',
  'approval',
  'dashboard',
];

export function createSafetyAIPlan(request: SafetyAIRequest): SafetyAIStep[] {
  const modules = request.modules?.length ? request.modules : DEFAULT_FLOW;
  const maxSteps = Math.max(1, Math.min(request.maxSteps ?? modules.length, modules.length));
  return modules.slice(0, maxSteps).map((module) => ({
    module,
    status: 'pending',
    input: { task: request.task, context: request.context ?? {} },
  }));
}

export function validateSafetyAIOutput(module: SafetyAIModule, output: unknown) {
  if (!output || typeof output !== 'object') return { ok: false, reason: 'Invalid output' };
  if (module === 'approval' && !('approved' in output)) return { ok: false, reason: 'Approval decision missing' };
  return { ok: true };
}
