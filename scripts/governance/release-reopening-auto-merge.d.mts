export interface PullRequestChangedFile {
  readonly filename: string;
  readonly status: string;
  readonly previous_filename?: string;
}

export const REOPENING_AUTHOR: Readonly<{ login: string; id: number; type: string }>;
export const REOPENING_VERSION_FILES: readonly string[];

export type ReleaseReopeningClassification =
  | { readonly eligible: true; readonly reason: string; readonly released: string; readonly opening: string }
  | { readonly eligible: false; readonly reason: string };

export function classifyReleaseReopening(input: {
  readonly pull: unknown;
  readonly files: readonly PullRequestChangedFile[];
  readonly repository: string;
  readonly read: (path: string, ref: string) => Promise<string>;
  readonly release: (tag: string) => Promise<unknown>;
}): Promise<ReleaseReopeningClassification>;

export type ReopeningValidationState = "pending" | "success" | "failure";
export type ReopeningAutoMergeAction = "arm" | "merge" | "wait" | "unchanged";

export function planReopeningAutoMerge(input: {
  readonly validation: ReopeningValidationState;
  readonly autoMergeArmed: boolean;
  readonly mergeableState: string | null | undefined;
  readonly mergeable: boolean | null | undefined;
}): ReopeningAutoMergeAction;
