export interface PullRequestChangedFile {
  readonly filename: string;
  readonly status: string;
  readonly previous_filename?: string;
}

export interface DocumentationAutoMergeClassification {
  readonly eligible: boolean;
  readonly examinedPaths: readonly string[];
  readonly disallowedPaths: readonly string[];
  readonly reason: string;
}

export function classifyDocumentationAutoMerge(
  files: readonly PullRequestChangedFile[],
): DocumentationAutoMergeClassification;

export type DocumentationValidationState = "pending" | "success" | "failure";
export type DocumentationAutoMergeAction = "arm" | "merge" | "wait" | "unchanged";

export function planDocumentationAutoMerge(input: {
  readonly validation: DocumentationValidationState;
  readonly autoMergeArmed: boolean;
  readonly mergeableState: string | null | undefined;
}): DocumentationAutoMergeAction;
