export interface ProgressObservation {
  readonly schema: string;
  readonly runId: string;
  readonly role: string;
  readonly stage: string;
  readonly pid: number;
  readonly processInstance: string;
  readonly timestampUnixUs: number;
  readonly clockErrorUs: number;
  readonly sequence: number;
  readonly tabId: string;
  readonly incarnation: number;
  readonly eventSequence: number;
  readonly revision: number;
  readonly geometryGeneration: number;
  readonly bytes: number;
  readonly count: number;
  readonly lostBefore: number;
  readonly eventKind?: string;
  readonly frameId?: number;
  readonly renderCause?: string;
  readonly fragmentCount?: number;
  readonly transactionKind?: "synchronized-output" | "ordinary";
}

export const progressObservationSchema: "a1-resident-progress-observation-v1";
export const progressStages: readonly string[];
export function readProgressObservations(directory: string, runId: string): Promise<{
  records: ProgressObservation[];
  faults: string[];
  files: string[];
}>;
export function validateProgressObservations(records: readonly ProgressObservation[], runId: string): string[];
export function evaluateProgressScenario(records: readonly ProgressObservation[], scenario: {
  readonly id: string;
  readonly tabIds: readonly string[];
  readonly viewedTabIds?: readonly string[];
  readonly startedUnixUs: number;
  readonly barrierUnixUs: number;
  readonly engineBaselines: Readonly<Record<string, number>>;
  readonly expectedFirstOrder: readonly string[];
}): {
  id: string;
  passed: boolean;
  faults: string[];
  byTab: Record<string, Record<string, number>>;
  observedFirstOrder: string[];
};
export function evaluateStoppedStageControl(records: readonly ProgressObservation[], control: {
  readonly id: string;
  readonly stage: "engine-delivery" | "child-render-write" | "holder-commit" | "outer-paint";
  readonly targetTabId: string;
  readonly tabIds: readonly string[];
  readonly startedUnixUs: number;
  readonly barrierUnixUs: number;
  readonly engineBaselines: Readonly<Record<string, number>>;
}): {
  id: string;
  stage: string;
  targetTabId: string;
  passed: boolean;
  faults: string[];
  counts: Record<string, Record<string, number>>;
};
export function progressLatencyReport(records: readonly ProgressObservation[], tabIds: readonly string[],
  activeWindows?: readonly { readonly startedUnixUs: number; readonly barrierUnixUs: number }[] | null): {
  perTab: Record<string, {
    engineToRender: LatencySummary;
    renderToPty: LatencySummary;
    commitToPaint: LatencySummary;
    holderWorstGapMs: number | null;
  }>;
  faults: string[];
};
export interface LatencySummary { readonly count: number; readonly p50Ms: number | null; readonly p95Ms: number | null; readonly maximumMs: number | null }
