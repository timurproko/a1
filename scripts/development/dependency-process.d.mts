import type { ChildProcess, spawn } from "node:child_process";
export interface NpmRunOptions {
  readonly cwd: string;
  readonly signal?: AbortSignal;
  readonly capture?: boolean;
  readonly env?: NodeJS.ProcessEnv;
  readonly npmCli?: string;
  readonly spawnProcess?: typeof spawn;
  readonly terminate?: (child: ChildProcess) => Promise<void>;
  readonly timeoutMs?: number;
}
export interface NpmResult { readonly code: number; readonly stdout: string }
export type NpmExecutor = (args: readonly string[], options: NpmRunOptions) => Promise<NpmResult>;
export function resolveNpmCli(env?: NodeJS.ProcessEnv): string;
export function runNpm(args: readonly string[], options: NpmRunOptions): Promise<NpmResult>;
