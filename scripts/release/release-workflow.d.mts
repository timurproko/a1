import type { ReleasePlan } from "./release-target.mjs";
export interface ReleaseRuntime {
  readonly cwd: string;
  git(args: readonly string[], directory?: string): string;
  gh(args: readonly string[]): string;
  releaseChanges(base: string, source: string): Promise<readonly { number: number; title: string; url: string }[]>;
  registry(name: string, version: string): Promise<unknown | null>;
  dispatchValidation(candidate: { repository: string; source: string; version: string }): Promise<{ runId: number; url: string; reused: boolean }>;
  log(message: string): void;
  error(message: string): void;
  readonly signal?: AbortSignal;
  readonly releaseDate?: string;
}
export interface DraftReleaseNote {
  readonly id: number;
  readonly url: string;
  readonly version: string;
  readonly source: string;
  readonly markdown: string;
  readonly updatedAt: string;
}
export interface ReleaseResult extends ReleasePlan {
  readonly source: string;
  readonly draft: DraftReleaseNote;
  readonly validationRunId: number;
}
export function collectReleaseChanges(
  git: (args: readonly string[]) => string,
  gh: (args: readonly string[]) => string,
  base: string,
  source: string,
): Promise<readonly { number: number; title: string; url: string }[]>;
export function createReleaseRuntime(options?: Partial<ReleaseRuntime>): ReleaseRuntime;
export function runRelease(args: readonly string[], runtime: ReleaseRuntime): Promise<ReleaseResult>;
