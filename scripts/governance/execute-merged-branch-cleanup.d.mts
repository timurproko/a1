import type { CleanupDecision, PullRequestCleanupMetadata } from "./merged-branch-cleanup.mjs";

export interface GithubResponse {
  readonly status: number;
  readonly body?: any;
}

export function executeMergedBranchCleanup(input: {
  readonly pull: PullRequestCleanupMetadata;
  readonly repository: string;
  readonly request: (path: string, options?: {
    readonly method?: string;
    readonly expected?: readonly number[];
  }) => Promise<GithubResponse>;
}): Promise<CleanupDecision & { readonly disposition: CleanupDecision["disposition"] | "deleted" | "failure" }>;
