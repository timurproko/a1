export function packageInstallArguments(prefix: string, candidate: string, cache: string, offline?: boolean): string[];
export function verifyInstalledCandidate(candidateBytes: Uint8Array, packageRoot: string): Promise<{ name: string; version: string; bin: Record<string, string>; files: number; bytes: number; sha256: string }>;
export function inspectDownloadCache(root: string): Promise<{ files: number; bytes: number }>;
