export type ResidentTabMeasurement = { samples: number; rejectedSamples: number; p95Ms: number | null; budgetMs: number; passed: boolean };

export function summarizeResidentTabMeasurements(samples: readonly Record<string, number | undefined>[], directStartupBudgetMs: number): { platform: string; directStartupBudgetMs: number; measurements: Record<string, ResidentTabMeasurement> };
export function findProcessedInput(output: string, token: string, sentNs: bigint): RegExpExecArray | null;
