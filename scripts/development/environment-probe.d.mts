export const PROBE_TIMEOUT_MS: number;
export interface VersionProbeResult {
  readonly version: string | null;
  readonly status: "ok" | "missing" | "timeout" | "spawn-error" | "exit" | "invalid-version";
  readonly code?: string;
  readonly exitCode?: number | null;
  readonly signal?: string | null;
}
export interface VersionProbeProcessResult {
  readonly status?: number | null;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly error?: { readonly code?: string };
  readonly signal?: string | null;
}
export function locateExecutable(command: string, options?: {
  platform?: string;
  env?: { PATH?: string; PATHEXT?: string };
  exists?: (path: string) => boolean;
}): string | null;
export function probeVersion(command: string, options?: {
  locate?: (command: string) => string | null;
  spawn?: (...args: unknown[]) => VersionProbeProcessResult;
}): VersionProbeResult;
export function probeFailureDetail(command: string, result: VersionProbeResult): string | null;
