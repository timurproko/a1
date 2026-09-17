export type PublicationRunner = (executable: string, args: string[], options?: Record<string, unknown>) => string;

export function run(executable: string, args: string[], options?: Record<string, unknown>): string;
export function git(args: string[], options?: Record<string, unknown>): string;
export function gh(args: string[], options?: Record<string, unknown>): string;
export function repositoryName(): string;
export function authoritativeDevelopHead(): Promise<string>;
export function resolveDevelopPreview(source: string, options?: {
  manifestText?: string;
  repository?: string;
  pullsText?: string;
}): Promise<{ source: string; pullRequest: number; version: string; packageName: string }>;
export function registryVersion(packageName: string, version: string, fetchImpl?: typeof fetch): Promise<Record<string, unknown> | null>;
export function describePublicationFailure(runId: number | string, options?: { run?: PublicationRunner; repository?: string }): string;
export function dispatchPublication(channel: "develop" | "stable", source: string, version: string, options?: {
  run?: PublicationRunner;
  repository?: string;
  requestId?: string;
  write?: (text: string) => void;
  sleep?: (ms: number) => Promise<unknown>;
}): Promise<number>;
export function localPackageIdentity(): Promise<{ name: string; version: string }>;
