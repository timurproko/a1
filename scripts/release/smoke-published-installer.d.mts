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
export function smokePublishedInstaller(options?: {
  environment?: NodeJS.ProcessEnv;
  spawnSync?: (command: string, args: string[], options: SmokeChildOptions) => SmokeChildResult;
}): Promise<void>;
