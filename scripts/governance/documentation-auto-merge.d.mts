export interface PullRequestChangedFile {
  readonly filename: string;
  readonly status: string;
  readonly previous_filename?: string;
  readonly patch?: string;
  readonly additions?: number;
  readonly deletions?: number;
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

export function inspectDocumentationDiff(pull: unknown, files: readonly PullRequestChangedFile[], read: (path: string, sha: string) => Promise<string>): Promise<DocumentationAutoMergeClassification>;
export function documentationControllerActive(repository: string, liveWorkflow: unknown, liveRepository: unknown, adapter?: { repository: string; documentationAutoMerge: string }): boolean;

export type DocumentationValidationState = "pending" | "success" | "failure";
export type DocumentationAutoMergeAction = "arm" | "merge" | "wait" | "unchanged";

export function planDocumentationAutoMerge(input: {
  readonly validation: DocumentationValidationState;
  readonly autoMergeArmed: boolean;
  readonly mergeableState: string | null | undefined;
  readonly mergeable: boolean | null | undefined;
}): DocumentationAutoMergeAction;
