export type WorktreeControlRequest =
  | { readonly action: "link-worktree"; readonly path: string }
  | { readonly action: "enter-worktree"; readonly branch: string; readonly base?: string; readonly repo?: string }
  | { readonly action: "unlink-worktree" }
  | { readonly action: "complete-worktree"; readonly change?: string; readonly pr?: number }
  | { readonly action: "remove-local-worktree" }
  | { readonly action: "worktrees"; readonly repo?: string }
  | { readonly action: "worktree-status" };

export interface WorktreeControlInventoryEntry {
  readonly cwd: string;
  readonly branch: string;
  readonly status: "current" | "busy" | "available" | "unverifiable";
  readonly agentId: string | null;
}

export type WorktreeControlOutcome =
  | { readonly kind: "linked"; readonly cwd: string; readonly branch: string }
  | { readonly kind: "unlinked"; readonly cwd: string }
  | { readonly kind: "completing"; readonly cwd: string; readonly branch: string; readonly startupRoot: string }
  | { readonly kind: "worktrees"; readonly entries: readonly WorktreeControlInventoryEntry[] }
  | { readonly kind: "status"; readonly startupDirectory: string; readonly cwd: string | null; readonly repositoryRoot: string | null; readonly branch: string | null; readonly health: "attached" | "detached" | "invalid" };
