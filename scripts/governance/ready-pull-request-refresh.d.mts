export interface RefreshPullRequestMetadata {
  readonly number?: number;
  readonly state?: string;
  readonly draft?: boolean;
  readonly base?: { readonly ref?: string; readonly repo?: { readonly full_name?: string } | null };
  readonly head?: { readonly sha?: string; readonly repo?: { readonly full_name?: string } | null } | null;
}

export type RefreshDisposition = "eligible" | "skipped" | "current" | "update" | "updated" | "deferred" | "blocked" | "failed";

export interface RefreshDecision {
  readonly disposition: RefreshDisposition;
  readonly number?: number | null;
  readonly headSha?: string | null;
  readonly targetSha?: string;
  readonly behindBy?: number;
  readonly reason?: string;
}

export interface RefreshResponse {
  readonly status: number;
  readonly body?: any;
}

export type RefreshRequester = (
  path: string,
  options?: { readonly method?: string; readonly body?: unknown; readonly expected?: readonly number[] },
) => Promise<RefreshResponse>;

export function classifyRefreshCandidate(pull: RefreshPullRequestMetadata | null | undefined, repository: string): RefreshDecision;

export function decideRefresh(
  eligibility: RefreshDecision,
  comparison: { readonly behind_by?: unknown } | null | undefined,
  targetSha: string,
): RefreshDecision;

export function interpretBranchUpdate(decision: RefreshDecision, response: RefreshResponse): RefreshDecision;

export function refreshReadyPullRequests(options: {
  readonly repository: string;
  readonly request: RefreshRequester;
  readonly maxPages?: number;
}): Promise<RefreshDecision[]>;
