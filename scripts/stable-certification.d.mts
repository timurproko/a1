import type { CandidateEvidence, CandidateOutcome } from "./candidate-evidence.mjs";

export interface StableExpectedIdentity {
  commit: string;
  tree: string;
  packageName: string;
  version: string;
  integrity: string;
  shasum: string;
}
export interface StablePlatformVerdict {
  schema: string;
  platform: "win32" | "linux" | "darwin";
  passed: boolean;
  isolatedWorker?: boolean;
  source: { commit: string; tree: string };
  package: { name: string; version: string; integrity: string; shasum: string };
  outcomes?: CandidateOutcome[];
  recordedAt: string;
  durationMs?: number;
}
export function createPlatformVerdict(input: StableExpectedIdentity & { platform: StablePlatformVerdict["platform"]; outcomes: CandidateOutcome[]; recordedAt?: string }): StablePlatformVerdict;
export function createPhysicalVerdict(input: StableExpectedIdentity & { platform: StablePlatformVerdict["platform"]; outcomes: CandidateOutcome[]; isolatedWorker: boolean; recordedAt?: string }): StablePlatformVerdict;
export function verifyAutomatedVerdicts(verdicts: StablePlatformVerdict[], expected: StableExpectedIdentity): StablePlatformVerdict[];
export function verifyStableVerdicts(input: { automated: StablePlatformVerdict[]; physical: StablePlatformVerdict[]; expected: StableExpectedIdentity }): { automated: StablePlatformVerdict[]; physical: StablePlatformVerdict[] };
export function createCertifiedStableEvidence(input: {
  automated: StablePlatformVerdict[];
  physical: StablePlatformVerdict[];
  expected: StableExpectedIdentity;
  tarballPath: string;
  runner: CandidateEvidence["runner"];
  createdAt?: string;
}): Promise<CandidateEvidence>;
