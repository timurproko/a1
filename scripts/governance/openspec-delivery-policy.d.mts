import type { ImplementationMetadata } from "./openspec-archive-policy.mjs";

export interface ConditionalAcceptanceManifest {
  version: 3;
  repository: string;
  change: string;
  sourcePr: number;
  archive: string;
  acceptanceManifest: string;
  finalizedDate: string;
  specBaseSha: string;
  acceptanceScenarios: string[];
  archiveDigest: string;
  specDigest: string;
  tasksDigest: string;
  evidenceDigest: string;
  knownGaps: string[];
}

export function deliveryContentDigest(entries: readonly (readonly [string, string | Buffer])[]): string;
export function parseConditionalAcceptance(text: string): ConditionalAcceptanceManifest;
export function conditionalAcceptanceBytes(manifest: ConditionalAcceptanceManifest): string;
export function verifyConditionalAcceptance(manifest: ConditionalAcceptanceManifest, context: {
  implementation: ImplementationMetadata;
  repository: string;
  sourcePr: number;
  archiveEntries: readonly (readonly [string, string | Buffer])[];
  specEntries: readonly (readonly [string, string | Buffer])[];
  evidenceEntries: readonly (readonly [string, string | Buffer])[];
  tasksBytes: string | Buffer;
  scenarios: string[];
  knownGaps?: string[];
}): { checklistDigest: string };
