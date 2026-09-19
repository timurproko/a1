export const STARTUP_EVIDENCE_SCHEMA: string;
export const TREND_WINDOW: number;

export interface StartupMeasurement { readonly profileId: "a1" | "pi"; readonly launchKind: "post-update" | "no-live-supervisor" | "warm"; readonly elapsedMs: number; readonly budgetMs: number }
export interface StartupEvidence { readonly schema: string; readonly enforcement?: string; readonly measurements: readonly StartupMeasurement[]; readonly budgetViolations?: readonly unknown[] }
export interface StartupTrendRun { readonly runId: number | string; readonly number?: number | null; readonly headSha?: string | null; readonly url?: string | null; readonly lanes: readonly { readonly lane: string; readonly evidence: unknown }[] }
export interface StartupTrendSample { readonly runId: number | string; readonly number: number | null; readonly headSha: string | null; readonly url: string | null; readonly elapsedMs: number; readonly budgetMs: number; readonly overrun: boolean }
export interface StartupTrendEntry {
  readonly key: string;
  readonly lane: string;
  readonly profileId: string;
  readonly launchKind: string;
  readonly budgetMs: number;
  readonly samples: readonly StartupTrendSample[];
  readonly insufficient: boolean;
  readonly persistent: boolean;
  readonly overruns: number;
  readonly verdict: "persistent" | "insufficient-overrun" | "insufficient" | "single" | "within-budget";
}
export interface StartupTrend { readonly window: number; readonly persistent: readonly StartupTrendEntry[]; readonly currentOverruns: readonly StartupTrendEntry[]; readonly entries: readonly StartupTrendEntry[]; readonly summary: string }

export function isStartupEvidence(value: unknown): value is StartupEvidence;
export function evaluateStartupTrend(runs: readonly StartupTrendRun[], options?: { window?: number }): StartupTrend;
export function renderStartupTrend(trend: StartupTrend, options?: { onlyPersistent?: boolean }): string[];
