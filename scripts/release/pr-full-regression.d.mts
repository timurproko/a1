export interface RegressionPull {
  number: number; state: string; draft: boolean; body: string | null;
  head: { sha: string; ref: string };
  base: { sha: string; ref: string; repo?: { full_name: string } };
  labels: { name: string }[];
}
export interface PullIdentity { pr: number; head: string; base: string; branch: string; draft: boolean; repository?: string; labels: string[]; bodyDigest: string }
export interface FullSelection extends PullIdentity {
  schema: string; mergeBase: string; selected: boolean; reasons: string[]; comparisonDigest: string; bootstrap: boolean; selectionId: string;
}
export function digest(value: unknown): string;
export function pullIdentity(pull: RegressionPull): PullIdentity;
export function changedPaths(text: string): string[];
export function selectFullRegression(input: { pull: RegressionPull; paths: string[]; historyPaths?: string[]; versionOnly?: boolean; mergeBase: string; bootstrap?: boolean }): FullSelection;
export function requireFullRegressionSelection(recorded: FullSelection | null, current: FullSelection, result: string | undefined): { selected: boolean; head: string; selectionId: string };
export function readCurrentPull(repository: string, number: number, token: string, request?: typeof fetch): Promise<RegressionPull>;
export function selectFromRepository(repo: string, pull: RegressionPull, bootstrap?: boolean): FullSelection;
