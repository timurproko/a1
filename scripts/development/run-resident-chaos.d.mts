export const CHAOS_SCHEMA: "a1-resident-chaos-v2";

export type ChaosAction =
  | { kind: "create"; mode: "stream" | "echo"; bytes: number }
  | { kind: "kill-server" }
  | { kind: "kill-holder" | "kill-child" | "stop-tab"; tab: number }
  | { kind: "idle"; delayMs: number };

export function createGenerator(seed: number): (limit: number) => number;
export function chooseAction(random: (limit: number) => number, openOrdinals: readonly number[]): ChaosAction;
export function nextAction(planned: readonly ChaosAction[] | null, random: (limit: number) => number, openOrdinals: readonly number[], step: number): ChaosAction;
export function readSchedule(report: unknown): ChaosAction[];
export function labelViolations(violations: readonly (string | Record<string, unknown>)[], seed: number, report: string | null): Record<string, unknown>[];
export function percentile(values: readonly number[], fraction: number): number | null;
export function listingViolations(tabs: readonly { tabId: string; holderPid?: number | null }[]): string[];
export function summarize(samples: Record<string, readonly number[]>): Record<string, { samples: number; p50Ms: number | null; p95Ms: number | null; maxMs: number | null }>;
export function recordContext(record: Record<string, unknown> | undefined): { present: false } | { present: true; tabId?: unknown; lifecycle?: unknown; desired?: unknown; incarnation?: unknown; restarts?: unknown; holderPid?: unknown; childPid?: unknown; lastExit?: unknown };
