import type { ReleasePlan } from "./release-target.mjs";
export interface ReleaseRuntime {
  readonly cwd: string;
  git(args: readonly string[], directory?: string): string;
  gh(args: readonly string[]): string;
  registry(name: string, version: string): Promise<unknown | null>;
  publish(source: string, version: string): Promise<unknown>;
  sleep(ms: number): Promise<unknown>;
  now(): number;
  readonly pollMs: number;
  readonly waitMs: number;
  log(message: string): void;
  error(message: string): void;
  readonly signal?: AbortSignal;
}
export interface ReleaseResult extends ReleasePlan {
  readonly source: string;
  readonly reopened: string;
}
export function createReleaseRuntime(options?: Partial<ReleaseRuntime>): ReleaseRuntime;
export function runRelease(args: readonly string[], runtime: ReleaseRuntime): Promise<ReleaseResult>;
