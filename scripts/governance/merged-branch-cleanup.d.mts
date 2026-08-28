export interface PullRequestCleanupMetadata {
  readonly number?: number;
  readonly merged?: boolean;
  readonly merged_at?: string | null;
  readonly base?: { readonly ref?: string };
  readonly head?: {
    readonly ref?: string;
    readonly sha?: string;
    readonly repo?: { readonly full_name?: string } | null;
  };
}

export interface CleanupDecision {
  readonly disposition: "eligible" | "refused" | "already-absent" | "delete";
  readonly number?: number;
  readonly ref?: string;
  readonly expectedSha?: string;
  readonly actualSha?: string | null;
  readonly reason?: string;
}

export function classifyMergedBranchCleanup(
  pull: PullRequestCleanupMetadata,
  repository: string,
): CleanupDecision;

export function decideMergedBranchCleanup(
  eligibility: CleanupDecision,
  live: { readonly kind: "absent" } | { readonly kind: "present"; readonly sha?: string; readonly protected?: boolean },
): CleanupDecision;
