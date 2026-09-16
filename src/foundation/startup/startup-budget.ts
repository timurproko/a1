import type { StartupTraceEvent } from "./startup-runtime.js";

export interface StartupPerformanceEvidence {
  readonly profileId: "a1" | "pi";
  readonly launchKind: "post-update" | "no-live-supervisor" | "warm";
  readonly events: readonly StartupTraceEvent[];
  readonly moduleGraph?: {
    readonly loadedFiles: number;
    readonly evaluatedBytes: number;
    readonly groups: readonly { readonly group: string; readonly files: number; readonly evaluatedBytes: number }[];
  };
}

export interface StartupBudgetViolation {
  readonly profileId: "a1" | "pi";
  readonly launchKind: "post-update" | "no-live-supervisor" | "warm";
  readonly elapsedMs: number;
  readonly budgetMs: number;
  readonly dominantPhases: readonly { readonly phase: string; readonly durationMs: number }[];
  readonly moduleGraph?: StartupPerformanceEvidence["moduleGraph"];
}

const STARTUP_PERFORMANCE_BUDGETS = { postUpdateMs: 2_000, noSupervisorMs: 2_500, warmMs: 2_000 } as const;

/** Resolve the declared budget for one launch kind so measurement and reporting never restate the numbers. */
export function resolveStartupBudgetMs(
  launchKind: StartupPerformanceEvidence["launchKind"],
  budgets: { readonly postUpdateMs: number; readonly noSupervisorMs: number; readonly warmMs: number } = STARTUP_PERFORMANCE_BUDGETS,
): number {
  return launchKind === "warm" ? budgets.warmMs : launchKind === "no-live-supervisor" ? budgets.noSupervisorMs : budgets.postUpdateMs;
}

/** Compare measured startup evidence with its budget without deciding whether the channel enforces it. */
export function evaluateStartupPerformanceBudget(
  evidence: StartupPerformanceEvidence,
  budgets: { readonly postUpdateMs: number; readonly noSupervisorMs: number; readonly warmMs: number } = STARTUP_PERFORMANCE_BUDGETS,
): StartupBudgetViolation | null {
  const events = [...evidence.events].sort((left, right) => left.elapsedMs - right.elapsedMs);
  const ready = events.findLast(event => event.phase === "first-input-ready-render");
  // Invariant: a launch that never became input-ready is a functional failure rather than a
  // timing observation, so it throws in every enforcement mode instead of being recorded.
  if (!ready) throw new Error(`startup budget failed for ${evidence.profileId}: first input-ready render was not recorded`);
  const budgetMs = resolveStartupBudgetMs(evidence.launchKind, budgets);
  if (ready.elapsedMs <= budgetMs) return null;
  const intervals = events.map((event, index) => ({
    phase: event.phase,
    durationMs: event.elapsedMs - (events[index - 1]?.elapsedMs ?? 0),
  })).sort((left, right) => right.durationMs - left.durationMs);
  return {
    profileId: evidence.profileId,
    launchKind: evidence.launchKind,
    elapsedMs: ready.elapsedMs,
    budgetMs,
    dominantPhases: intervals.slice(0, 3),
    ...evidence.moduleGraph === undefined ? {} : { moduleGraph: evidence.moduleGraph },
  };
}

/** Render one budget violation as the single message used by failures, evidence, and run summaries. */
export function formatStartupBudgetViolation(violation: StartupBudgetViolation): string {
  const graph = violation.moduleGraph === undefined ? ""
    : `; module graph: ${violation.moduleGraph.loadedFiles} files, ${violation.moduleGraph.evaluatedBytes} evaluated bytes (${violation.moduleGraph.groups.map(group => `${group.group} ${group.files}/${group.evaluatedBytes}`).join(", ")})`;
  const phases = violation.dominantPhases.map(item => `${item.phase} ${Math.round(item.durationMs)}ms`).join(", ");
  return `startup budget failed for ${violation.profileId} ${violation.launchKind}: ${Math.round(violation.elapsedMs)}ms exceeds ${violation.budgetMs}ms; dominant phases: ${phases}${graph}`;
}

/** Enforce the startup budget in a channel that fails on an overrun. */
export function assertStartupPerformanceBudget(
  evidence: StartupPerformanceEvidence,
  budgets?: { readonly postUpdateMs: number; readonly noSupervisorMs: number; readonly warmMs: number },
): void {
  const violation = evaluateStartupPerformanceBudget(evidence, budgets);
  if (violation) throw new Error(formatStartupBudgetViolation(violation));
}
