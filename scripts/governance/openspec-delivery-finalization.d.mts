import type { ConditionalAcceptanceManifest } from "./openspec-delivery-policy.mjs";

export function replaceImplementationMetadata(body: string, metadata: unknown): string;
export function prepareSinglePrDelivery(options: {
  root: string;
  change: string;
  repository: string;
  sourcePr: number;
  body: string;
  specBaseSha: string;
  date: string;
  knownGaps?: string[];
  write?: boolean;
  bodyPath?: string | null;
  targetSpecs?: Map<string, Buffer> | null;
  toolRoot?: string;
}): Promise<{
  disposition: "would-finalize" | "finalized" | "would-refinalize" | "refinalized" | "already-finalized";
  refinalized?: boolean;
  paths?: { active: string; archive: string; specs: string[]; branch: string };
  changes: { filename: string; status: string; data: Buffer | null }[];
  body: string;
  manifest?: ConditionalAcceptanceManifest;
  implementation?: unknown;
}>;
