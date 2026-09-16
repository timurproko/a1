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

export interface ExactPackagePreparationEvidence {
  schema: "a1-exact-package-preparation-evidence-v1";
  receiptId?: string;
  count: 1;
  durationMs?: number;
  candidateSha256?: string;
  package?: { name: string; version: string };
  lane?: Record<string, string>;
  policy?: string;
  prefix?: string;
  installedIdentity?: Record<string, unknown>;
  proxySynchronizations?: 1;
  consumers: Array<"package-startup" | "package-contracts">;
  cleanup: null | { status: "passed" | "deferred" | "failed"; durationMs?: number; error: string | null };
}

export interface ValidationExecutionOutcome {
  id: string;
  command: string;
  exitCode: number;
  durationMs: number;
  scopes: string[];
  skipped?: string;
  preparation?: "receipt-missing-or-incompatible" | "identity-rejected" | "owner-failed-and-identity-rejected";
  evidence?: ValidationInvocationEvidence | ExactPackagePreparationEvidence;
}

export interface ValidationPlan {
  schema: string;
  requested: string[];
  selected: string[];
  requiresBuild: boolean;
  consumesPackage: boolean;
  candidateTarball: string;
  structuralEvidence?: Record<string, Record<string, number>>;
  exactPackagePreparation?: null | {
    id: "exact-package-preparation";
    count: 1;
    policy: string;
    consumers: Array<"package-startup" | "package-contracts">;
  };
  commands: ValidationCommandPlan[];
  vitest: null | {
    mode: string;
    invocations: Array<{ id: string; arguments: string[]; scopes: string[]; evidence?: ValidationInvocationEvidence }>;
  };
  releaseContracts?: Record<string, string>;
}

export function loadValidationSuites(repository?: string): Promise<Record<string, unknown>>;
export function createTierPlan(requested: string[], repository?: string, options?: { additionalTests?: string[] }): Promise<ValidationPlan>;
export function runTierPlan(plan: ValidationPlan, options?: {
  env?: NodeJS.ProcessEnv;
  stdio?: "inherit" | "pipe";
  repository?: string;
  executeCommand?: (command: { id: string; executable: string; arguments: string[] }, environment: NodeJS.ProcessEnv, stdio: "inherit" | "pipe") => Promise<Omit<ValidationExecutionOutcome, "scopes">>;
  verifyBuildReceipt?: (path: string, options: { repository: string }) => Promise<unknown>;
  verifyPackageReceipt?: (receipt: string, candidate: string, options: Record<string, unknown>) => Promise<unknown>;
  recordBuildReceipt?: (options: { repository: string; output: string }) => Promise<unknown>;
  prepareExactPackageInstallation?: (options: Record<string, unknown>) => Promise<any>;
  exactPackagePreparationEnvironment?: (preparation: any) => NodeJS.ProcessEnv;
  verifyExactPackagePreparation?: (options: Record<string, unknown>) => Promise<any>;
  cleanupExactPackagePreparation?: (preparation: any) => Promise<{ status: "passed" | "deferred" | "failed"; durationMs: number; error: string | null }>;
}): Promise<{
  schema: string;
  passed: boolean;
  startedAt: number;
  completedAt: number;
  exactPackagePreparation: Record<string, unknown> | null;
  outcomes: ValidationExecutionOutcome[];
}>;
