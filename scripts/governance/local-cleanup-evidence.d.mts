import type { ArchiveReader } from "./openspec-archive-github.mjs";
export function cleanupReader(options: { repository: string; token?: string; deadline: number; now?: () => number;
  fetchImpl?: typeof fetch; budget?: { remaining: number }; onBackoff?: (until: number) => void }): ArchiveReader;
export function verifyCleanupEvidence(reader: ArchiveReader, entry: { sourcePr: number; candidatePr: number;
  change: string; role: "implementation" | "acceptance" | "archive"; head: string; ref: string | null }): Promise<any>;
