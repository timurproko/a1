export interface WorktreeCleanupSnapshot {
  readonly version: 1; readonly path: string; readonly commonDir: string; readonly gitDir: string;
  readonly head: string; readonly ref: string; readonly filesystem: string; readonly pointer: string;
  readonly admin: string; readonly pointerBytes: string;
}
export function captureWorktreeCleanupSnapshot(path: string): Promise<WorktreeCleanupSnapshot>;
export function assertWorktreeCleanupSnapshot(expected: unknown, actual: unknown): asserts expected is WorktreeCleanupSnapshot;
