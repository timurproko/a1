export interface RevisionDependencyFile {
  mode: string;
  oid: string;
  size: number;
  source?: string;
}
export interface RevisionDependencySnapshot {
  revision: string;
  files: Map<string, RevisionDependencyFile>;
}
export interface RevisionDependencyLimits {
  files: number;
  bytes: number;
  fileBytes: number;
  timeoutMs: number;
}
/** Reads only immutable Git objects, with comparison-local memoization and bounded batches. */
export function createRevisionDependencyReader(repository: string, options?: { limits?: Partial<RevisionDependencyLimits> }): {
  stats: { gitCommands: number; revisions: number; blobs: number; bytes: number };
  read(revision: string): Promise<RevisionDependencySnapshot>;
};
/** Paths usable in repository-local dependency evidence without normalization ambiguity. */
export function isDependencyPath(value: unknown): boolean;
