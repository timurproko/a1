import type { WorktreeCleanupSnapshot } from "./worktree-cleanup-snapshot.mjs";
export interface CleanupExecutionOptions {
  readonly dataDir?: string | undefined; readonly environment?: NodeJS.ProcessEnv | undefined;
  readonly signal?: AbortSignal | undefined; readonly lockTimeoutMs?: number | undefined;
  readonly maxBuffer?: number | undefined; readonly protectTarget?: boolean | undefined; readonly timeoutMs?: number | undefined; readonly cwd?: string | undefined; readonly input?: string | undefined;
}
export function cleanupClaimDirectory(options?: CleanupExecutionOptions): string;
export function assertApprovedCleanupTarget(expected: WorktreeCleanupSnapshot, options?: CleanupExecutionOptions): Promise<void>;
export function withWorktreeClaimExclusion<T>(expected: Pick<WorktreeCleanupSnapshot, "path" | "commonDir" | "gitDir" | "ref">, options: CleanupExecutionOptions, operation: () => Promise<T>): Promise<T>;
export function withUnclaimedWorktree<T>(expected: WorktreeCleanupSnapshot, options: CleanupExecutionOptions, operation: () => Promise<T>): Promise<T>;
export function executeUnclaimedWorktreeCleanup(expected: WorktreeCleanupSnapshot, command: string, args: readonly string[], options?: CleanupExecutionOptions): Promise<string>;
export function verifyCleanupReservation(path: string): Promise<void>;
export function executeCleanupCommand(command: string, args: readonly string[], options?: CleanupExecutionOptions): Promise<string>;
