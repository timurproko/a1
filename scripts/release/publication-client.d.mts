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
  /** The first-parent commit count of `source`; read from the local clone when omitted. */
  commitCount?: string;
}): Promise<{ source: string; pullRequest: number; version: string; packageName: string }>;
export function registryVersion(packageName: string, version: string, fetchImpl?: typeof fetch): Promise<Record<string, unknown> | null>;
export interface PublicationJob {
  id: number;
  name: string;
  status?: string;
  conclusion: string | null;
}
export function describePublicationFailure(runId: number | string, options?: {
  run?: PublicationRunner;
  repository?: string;
  version?: string;
  jobs?: PublicationJob[];
  develop?: boolean;
}): string;
export function dispatchPublication(channel: "develop", source: string, version: string, options?: {
  run?: PublicationRunner;
  repository?: string;
  requestId?: string;
  write?: (text: string) => void;
  sleep?: (ms: number) => Promise<unknown>;
  signal?: AbortSignal;
  isTTY?: boolean;
  environment?: NodeJS.ProcessEnv;
  /** Read current output dimensions; defaults to stdout. Unknown dimensions disable cursor updates. */
  terminalSize?: () => { columns: number; rows: number };
}): Promise<number>;
export function dispatchStableValidation(candidate: {
  repository: string;
  source: string;
  version: string;
}, options?: {
  run?: PublicationRunner;
  requestId?: string;
  sleep?: (ms: number) => Promise<unknown>;
}): Promise<{ runId: number; url: string; reused: boolean }>;
export function waitForStableValidation(validation: { repository: string; runId: number }, options?: {
  run?: PublicationRunner;
}): Promise<Record<string, unknown>>;
export function localPackageIdentity(): Promise<{ name: string; version: string }>;
