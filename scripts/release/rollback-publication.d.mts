export const NPM_UPLOAD_STEPS: readonly string[];
export function npmUploadStarted(jobs: readonly unknown[]): boolean;
export type PublicationRollbackPlan =
  | { action: "keep"; reason: string }
  | { action: "rollback"; returnToDraft: boolean; deleteTag: boolean; reason: string };
export function planPublicationRollback(input: {
  version: string;
  release: unknown;
  tag: unknown | null;
  application: unknown | null;
  installer: unknown | null;
  jobs: readonly unknown[] | null;
  jobsComplete: boolean;
}): PublicationRollbackPlan;
