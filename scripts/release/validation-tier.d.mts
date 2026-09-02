export interface ValidationCommandPlan {
  id: string;
  executable: string;
  arguments: string[];
  owners: string[];
}

export interface ValidationInvocationEvidence {
  executionClass: "resource-sensitive";
  testFiles: string[];
  fileParallelism: false;
  timeoutMs: 5000;
  timeoutSource: "vitest-default";
  retries: 0;
  perFileTiming: "vitest-default-reporter";
}

export interface ValidationExecutionOutcome {
  id: string;
  command: string;
  exitCode: number;
  durationMs: number;
  skipped?: string;
  evidence?: ValidationInvocationEvidence;
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
    invocations: Array<{ id: string; arguments: string[]; evidence?: ValidationInvocationEvidence }>;
  };
  releaseContracts?: Record<string, string>;
}

export function loadValidationSuites(repository?: string): Promise<Record<string, unknown>>;
export function createTierPlan(requested: string[], repository?: string): Promise<ValidationPlan>;
export function runTierPlan(plan: ValidationPlan, options?: {
  env?: NodeJS.ProcessEnv;
  stdio?: "inherit" | "pipe";
  executeCommand?: (command: { id: string; executable: string; arguments: string[] }, environment: NodeJS.ProcessEnv, stdio: "inherit" | "pipe") => Promise<ValidationExecutionOutcome>;
}): Promise<{
  schema: string;
  passed: boolean;
  startedAt: number;
  completedAt: number;
  outcomes: ValidationExecutionOutcome[];
}>;
