export const TRIAGE_WORKFLOWS: Readonly<Record<string, { readonly file: string; readonly scheduledOnly: boolean }>>;
export const BRANCH_PREFIX: string;
export const TRIAGED_BRANCH: string;
export const TRIAGE_KEY_LABEL: string;
export const TRIAGE_PROVENANCE_SCHEMA: string;
export const TRIAGE_PROVENANCE_FILE: string;
export const EXCERPT_LINE_LIMIT: number;
export const EXCERPT_BYTE_LIMIT: number;

export interface TriageRun {
  readonly id: number | string;
  readonly number?: number;
  readonly attempt: number;
  readonly url: string;
  readonly headSha: string;
  readonly event: string;
  readonly createdAt: string;
  readonly workflowName?: string;
  readonly conclusion?: string;
  readonly headBranch?: string;
}

export interface TriageWorkflow { readonly name: string; readonly file: string; readonly scheduledOnly: boolean }

export interface TriageLane {
  readonly id: string;
  readonly job: string;
  readonly conclusion: string;
  readonly result: unknown;
  readonly excerpt?: readonly string[];
}

export interface TriageFailureLane { readonly id: string; readonly exitCode: number; readonly durationMs: number; readonly excerpt: readonly string[] }

export interface TriageFailure {
  readonly id: string;
  readonly command: string;
  readonly scopes: readonly string[];
  readonly tests: readonly string[];
  readonly lanes: readonly TriageFailureLane[];
  readonly preparation: string | null;
}

export interface TriageSummary {
  readonly failures: readonly TriageFailure[];
  readonly orchestration: readonly { readonly lane: string; readonly job: string; readonly excerpt: readonly string[] }[];
}

export interface TriageCommit { readonly sha: string; readonly subject: string; readonly pr: number | null }
export interface TriageLastGreen { readonly id: number | string; readonly number?: number; readonly url: string; readonly headSha: string }

export interface TriageEvidence {
  readonly workflow: TriageWorkflow;
  readonly run: TriageRun;
  readonly summary: TriageSummary;
  readonly lastGreen: TriageLastGreen | null;
  readonly commits: readonly TriageCommit[];
}

export function changeId(date: string): string;
export function branchName(date: string): string;
export function triageDecision(run: { readonly id: number | string; readonly workflowName: string; readonly conclusion: string; readonly event: string; readonly headBranch: string }): { readonly triage: false; readonly reason: string } | { readonly triage: true; readonly failed: boolean; readonly workflow: TriageWorkflow };
export const STARTUP_BUDGET_FAILURE: { readonly id: string; readonly scope: string; readonly test: string };
export function startupBudgetFailure(trend: { readonly window: number; readonly persistent: readonly { readonly lane: string }[] }, tableLines: readonly string[]): TriageFailure | null;
export function isTierResult(value: unknown): boolean;
export function commandTests(command: string): string[];
export function summarizeLanes(lanes: readonly TriageLane[]): TriageSummary;
export function triageKey(workflowFile: string, summary: TriageSummary): string;
export function parseTriageKey(body: string | null | undefined): string | null;
export function extractLogExcerpts(log: string, options?: { lineLimit?: number; byteLimit?: number }): Map<string, string[]>;
export function renderRunEvidence(evidence: TriageEvidence): string[];
export function renderTriageBody(input: TriageEvidence & { readonly date: string; readonly key: string }): string;
export function appendRunToBody(body: string, evidence: TriageEvidence): string;
export function renderTriageProvenance(input: TriageEvidence & { readonly date: string }): string;
export function appendTriageProvenance(text: string, evidence: TriageEvidence): string;
export function renderTriageChange(input: TriageEvidence & { readonly date: string }): Record<string, string>;
export function appendRunToDesign(design: string, evidence: TriageEvidence): string;
