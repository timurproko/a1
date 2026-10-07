export type PublicationMode = "develop" | "nightly" | "candidate" | "stable";

export interface PublicationValidationLane {
  platform: "win32-node24" | "linux-node24" | "darwin-node24" | "win32-node22";
  os: "windows-2025" | "ubuntu-24.04" | "macos-15";
  node: 22 | 24;
}

export interface PublicationWindowsShardLane extends PublicationValidationLane {
  os: "windows-2025";
  shard: import("./full-regression-shards.mjs").FullRegressionShard;
}

export const PUBLICATION_MODES: readonly PublicationMode[];
export const PUBLICATION_VALIDATION_LANES: readonly PublicationValidationLane[];
export function publicationValidationMatrix(mode: string): { include: PublicationValidationLane[] };
export function publicationSequentialValidationMatrix(mode: string): { include: PublicationValidationLane[] };
export function publicationWindowsShardMatrix(mode: string): { include: PublicationWindowsShardLane[] };
