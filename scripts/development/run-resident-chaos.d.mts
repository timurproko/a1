export const CHAOS_SCHEMA: "a1-resident-chaos-v1";
export function percentile(values: readonly number[], fraction: number): number | null;
export function listingViolations(tabs: readonly { tabId: string; holderPid?: number | null }[]): string[];
export function summarize(samples: Record<string, readonly number[]>): Record<string, { samples: number; p50Ms: number | null; p95Ms: number | null; maxMs: number | null }>;
export function recordContext(record: Record<string, unknown> | undefined): { present: false } | { present: true; tabId?: unknown; lifecycle?: unknown; desired?: unknown; incarnation?: unknown; restarts?: unknown; holderPid?: unknown; childPid?: unknown; lastExit?: unknown };
