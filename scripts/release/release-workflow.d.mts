import type { ReleasePlan } from "./release-target.mjs";
export interface ReleaseRuntime {
  readonly cwd: string;
  git(args: readonly string[], directory?: string): string;
  gh(args: readonly string[]): string;
  releaseChanges(base: string, source: string): Promise<readonly { number: number; title: string; url: string }[]>;
  registry(name: string, version: string): Promise<unknown | null>;
  publish(source: string, version: string, approval: ApprovedReleaseNote): Promise<unknown>;
  sleep(ms: number): Promise<unknown>;
  now(): number;
  readonly pollMs: number;
  readonly waitMs: number;
  log(message: string): void;
  error(message: string): void;
  readonly signal?: AbortSignal;
}
export interface DraftReleaseNote {
  readonly id: number;
  readonly url: string;
  readonly version: string;
  readonly source: string;
  readonly markdown: string;
}
export interface ApprovedReleaseNote extends DraftReleaseNote { readonly sha256: string }
export interface ReleaseResult extends ReleasePlan {
  readonly source: string;
  readonly draft: DraftReleaseNote;
  readonly reopened: string | null;
}
export function collectReleaseChanges(
  git: (args: readonly string[]) => string,
  gh: (args: readonly string[]) => string,
  base: string,
  source: string,
): Promise<readonly { number: number; title: string; url: string }[]>;
export function createReleaseRuntime(options?: Partial<ReleaseRuntime>): ReleaseRuntime;
export function runRelease(args: readonly string[], runtime: ReleaseRuntime): Promise<ReleaseResult>;
