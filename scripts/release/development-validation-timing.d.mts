export interface DevelopmentScopeTiming { job: string; id: string; scope: string; durationMs: number }
export interface DevelopmentJobTiming { job: string; runnerMs: number; scopeDurations: Omit<DevelopmentScopeTiming, "job">[] }
export function evaluateDevelopmentValidationTiming(options: {
  jobs: DevelopmentJobTiming[];
  aggregateProcessingMs?: number;
  criticalPathLimitMs?: number;
  scopeLimitMs?: number;
}): {
  aggregateProcessingMs: number;
  criticalPathMs: number;
  runnerMs: number;
  maxScopeMs: number;
  scopes: DevelopmentScopeTiming[];
  targets: { criticalPathLimitMs: number; scopeLimitMs: number; criticalPathMet: boolean; scopeMet: boolean };
};
