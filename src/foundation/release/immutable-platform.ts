import type { Stats } from "node:fs";

export type ImmutablePlatformPolicy = "windows-readonly-content-v1" | "posix-readonly-content-v1";

/** Name the platform protection established while complete payload verification owns every file. */
export function immutablePlatformPolicy(platform: NodeJS.Platform = process.platform): ImmutablePlatformPolicy | null {
  if (platform === "win32") return "windows-readonly-content-v1";
  if (platform === "linux" || platform === "darwin") return "posix-readonly-content-v1";
  return null;
}

/** Refuse certification when a payload file is writable after immutable materialization. */
export function assertImmutableFileMode(metadata: Pick<Stats, "mode">, path: string): void {
  if ((metadata.mode & 0o222) !== 0) throw new Error(`immutable payload file is writable: ${path}`);
}
