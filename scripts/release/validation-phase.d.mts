export type PhaseDisposition = "passed" | "failed" | "deferred";

export interface ValidationPhaseEvent {
  schema: "a1-validation-phase-v1";
  fixture: string;
  invocation: string;
  nodeVersion: string;
  platform: string;
  architecture: string;
  head: string | null;
  runId: string | null;
  runAttempt: string | null;
  runnerOS: string | null;
  cacheState: "unmeasured";
  candidateSha256: string | null;
  id: number;
  phase: string;
  status: "started" | PhaseDisposition;
  durationMs: number;
}

export interface ValidationPhaseRecorder {
  outputPath: string;
  start(phase: string): (status?: PhaseDisposition) => void;
  bindCandidate(bytes: Uint8Array): void;
  run<T>(phase: string, operation: () => T | Promise<T>, disposition?: (value: T) => PhaseDisposition): Promise<T>;
  cleanup<T>(phase: string, operation: () => T | Promise<T>, disposition?: (value: T) => PhaseDisposition): Promise<T>;
  runWithCleanup<T>(phase: string, operation: () => T | Promise<T>, cleanupPhase: string, teardown: () => unknown | Promise<unknown>): Promise<T>;
  runSync<T>(phase: string, operation: () => T): T;
}

/** Creates immediate bounded evidence without recording command output, errors, or arbitrary environment values. */
export function createValidationPhaseRecorder(fixture: string, options?: {
  directory?: string;
  head?: string;
  clock?: () => number;
  environment?: NodeJS.ProcessEnv;
  emit?: (event: ValidationPhaseEvent) => void;
}): ValidationPhaseRecorder;
