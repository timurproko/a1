import type { TriageCommit, TriageLastGreen, TriageRun, TriageSummary } from "./regression-triage-report.mjs";

export interface ProposalExecutor { (args: string[]): Promise<{ stdout: string }> }

export interface ProposalFiles {
  mkdir(path: string): Promise<unknown>;
  list(path: string): Promise<string[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<unknown>;
}

export interface ProposalResult {
  readonly schema?: string;
  readonly changed: boolean;
  readonly mode?: "new" | "refresh";
  readonly message: string;
  readonly run: TriageRun;
  readonly workflow?: string;
  readonly key?: string;
  readonly branch?: string;
  readonly pr?: number | null;
  readonly change?: string;
  readonly summary?: TriageSummary;
  readonly lastGreen?: TriageLastGreen | null;
  readonly commits?: readonly TriageCommit[];
  readonly existing?: { readonly number: number; readonly branch: string; readonly url: string } | null;
}

export function proposeRegressionFix(options: {
  runId: number | string;
  repository: string;
  output: string;
  gh: ProposalExecutor;
  git: ProposalExecutor;
  files: ProposalFiles;
  dryRun?: boolean;
  today?: Date;
}): Promise<ProposalResult>;
