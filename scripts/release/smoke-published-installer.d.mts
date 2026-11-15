import type { ProcessSnapshot } from "../development/checkout-process-inspection.mjs";

export interface SmokeChildOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeout: number;
}
export interface SmokeChildResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal?: string | null;
  readonly error?: Error;
}
/** One process sighting series collected while a long smoke command ran. */
export interface SmokeProcessSighting extends ProcessSnapshot {
  readonly firstSeen: string;
  readonly lastSeen: string;
}
export interface SmokeProcessHistory {
  readonly samples: number;
  readonly errors: number;
  readonly lastError: string | null;
  readonly rows: readonly SmokeProcessSighting[];
}
export interface SmokeRunner {
  run(command: string, args: string[], options: SmokeChildOptions): SmokeChildResult | Promise<SmokeChildResult>;
  /** Fixture-owned processes that settlement would stop, read without stopping anything. */
  inventory?(): Promise<readonly ProcessSnapshot[]>;
  /** Sightings sampled during long commands; absent when the runner does not sample. */
  history?(): SmokeProcessHistory;
  close(): Promise<void>;
}
export function updateCommandBudgetMs(platform?: NodeJS.Platform): number;
export function smokePublishedInstaller(options?: {
  environment?: NodeJS.ProcessEnv;
  createRunner?: (root: string) => SmokeRunner;
  removeFixture?: (root: string) => Promise<void>;
  writeDiagnostic?: (text: string) => void;
}): Promise<void>;
