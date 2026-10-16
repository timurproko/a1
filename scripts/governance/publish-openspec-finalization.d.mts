import type { FinalizationResult } from "./openspec-finalization-publication.mjs";

export function reportResult(result: FinalizationResult, log?: (line: string) => void): 0 | 1;
export function main(args?: string[], environment?: NodeJS.ProcessEnv): Promise<FinalizationResult | Record<string, unknown>>;
