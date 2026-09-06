export interface CandidateOutcome {
  id: string;
  exitCode: number;
  durationMs: number;
  skipped?: string;
}

export interface CandidateEvidence {
  schema: string;
  source: { commit: string; tree: string };
  identity: { schema: string; packageName: string; commandName: string; cliEntry: string };
  package: { name: string; version: string; bin: Record<string, string>; tarball: string; integrity: string; shasum: string };
  channel: "next" | "latest";
  validation: { selected: string[]; outcomes: CandidateOutcome[]; gateIds: string[] };
  runner: { workflow: string; runId: string; attempt: number; label: string };
  certification: { class: string; physical: string; crossPlatform: string; stableEligible: boolean };
  createdAt: string;
}

export function createCandidateEvidence(input: {
  tarballPath: string;
  commit: string;
  tree: string;
  channel: "next" | "latest";
  selected: string[];
  outcomes: CandidateOutcome[];
  runner: CandidateEvidence["runner"];
  certification?: CandidateEvidence["certification"];
  identity?: { schema: string; packageName: string; commandName: string; artifacts: { cliEntry: string } };
  createdAt?: string;
}): Promise<CandidateEvidence>;
export function verifyCandidateEvidence(evidence: CandidateEvidence, options: {
  tarballPath: string;
  commit?: string;
  tree?: string;
  version?: string;
  channel?: "next" | "latest";
  requireStable?: boolean;
}): Promise<{ packageName: string; version: string; integrity: string; shasum: string; bin: Record<string, string> }>;
export function readPackedManifest(tarball: Buffer): { name: string; version: string; bin: Record<string, string>; dependencies?: Record<string, string>; repository?: { type: string; url: string } };
export function readPackedEntries(tarball: Buffer): Array<{ path: string; content: Buffer; type: string; mode: number }>;
export function guardianBinaryReference(manifestPath: string, content: Buffer | string): { binaryPath: string; sha256: string; size: number } | null;
