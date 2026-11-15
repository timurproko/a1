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
export interface SmokeRunner {
  run(command: string, args: string[], options: SmokeChildOptions): SmokeChildResult | Promise<SmokeChildResult>;
  close(): Promise<void>;
}
export function updateCommandBudgetMs(platform?: NodeJS.Platform): number;
export function smokePublishedInstaller(options?: {
  environment?: NodeJS.ProcessEnv;
  createRunner?: (root: string) => SmokeRunner;
  removeFixture?: (root: string) => Promise<void>;
  writeDiagnostic?: (text: string) => void;
}): Promise<void>;
