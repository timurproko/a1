export interface RegressionPull {
  number: number; state: string; draft: boolean; body: string | null;
  user: { login: string; id: number; type: string };
  head: { sha: string; ref: string };
  base: { sha: string; ref: string; repo?: { full_name: string } };
  labels: { name: string }[];
}
export interface PullIdentity {
  pr: number; head: string; base: string; branch: string; draft: boolean; repository?: string;
  author: { login: string; id: number; type: string }; bodyDigest: string;
}
export interface RegressionSource {
  workflowName: "Full regression" | "Release"; workflowFile: "full-regression.yml" | "release.yml";
  runId: number; runNumber: number; attempt: number; event: "schedule" | "workflow_dispatch";
  conclusion: "failure" | "success"; headBranch: "develop"; headSha: string; url: string; createdAt: string;
}
export interface RegressionProvenance {
  schema: "a1-regression-triage-provenance-v1";
  candidate: { branch: string; change: string };
  sources: RegressionSource[];
}
export interface FullSelection extends PullIdentity {
  schema: string; mergeBase: string; selected: boolean; reasons: string[]; comparisonDigest: string; selectionId: string;
}
export function digest(value: unknown): string;
export function pullIdentity(pull: RegressionPull): PullIdentity;
export function changedPaths(text: string): string[];
export function parseRepairProvenance(value: unknown): RegressionProvenance;
export function selectFullRegression(input: { pull: RegressionPull; paths: string[]; versionOnly?: boolean; mergeBase: string; provenance?: RegressionProvenance | null }): FullSelection;
export function requireFullRegressionSelection(recorded: FullSelection | null, current: FullSelection, result: string | undefined): { selected: boolean; head: string; selectionId: string };
export function verifyFailedRegressionSource(repository: string, provenance: RegressionProvenance, token: string, request?: typeof fetch): Promise<RegressionSource>;
export function readCurrentPull(repository: string, number: number, token: string, request?: typeof fetch): Promise<RegressionPull>;
export function selectFromRepository(repo: string, pull: RegressionPull): FullSelection;
