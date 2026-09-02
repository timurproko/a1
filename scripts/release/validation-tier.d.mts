export interface ValidationCommandPlan {
  id: string;
  executable: string;
  arguments: string[];
  owners: string[];
}

export interface ValidationPlan {
  schema: string;
  requested: string[];
  selected: string[];
  requiresBuild: boolean;
  consumesPackage: boolean;
  candidateTarball: string;
  structuralEvidence?: Record<string, Record<string, number>>;
  commands: ValidationCommandPlan[];
  vitest: null | {
    mode: string;
    invocations: Array<{ id: string; arguments: string[] }>;
  };
  releaseContracts?: Record<string, string>;
}

export function loadValidationSuites(repository?: string): Promise<Record<string, unknown>>;
export function createTierPlan(requested: string[], repository?: string): Promise<ValidationPlan>;
export function runTierPlan(plan: ValidationPlan, options?: { env?: NodeJS.ProcessEnv; stdio?: "inherit" | "pipe" }): Promise<{
  schema: string;
  passed: boolean;
  startedAt: number;
  completedAt: number;
  outcomes: Array<{ id: string; command: string; exitCode: number; durationMs: number; skipped?: string }>;
}>;
