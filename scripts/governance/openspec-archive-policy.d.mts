import type { PullRequestChangedFile } from "./documentation-auto-merge.mjs";

export const ARCHIVE_TASKS: Readonly<Record<"recordEvidence" | "stageArchive", string>>;
export const SHA: RegExp;
export const CHANGE: RegExp;
export interface ArchiveFailure extends Error { archiveCode: string; archiveDetail: string }
type LegacyImplementationMetadata = {
  change: string;
  archivePreparationTasks?: Partial<Record<keyof typeof ARCHIVE_TASKS, string>>;
} & ({ version: 1; specificationPr: number } | { version: 2; specificationPr?: never });
export type ImplementationMetadata = LegacyImplementationMetadata | {
  version: 3;
  change: string;
  specificationPr?: never;
  archivePreparationTasks?: never;
  archive?: string;
  acceptanceManifest?: string;
};
export interface AcceptanceMetadata {
  version: 1;
  change: string;
  headSha: string;
  specBaseSha: string;
  verdict: "accepted" | "rejected" | "revoked";
  implementationComplete: boolean;
  manualReview: "passed" | "failed" | "pending";
  specSyncReviewed: boolean;
  evidence: string;
}
export interface ArchivePaths { active: string; archive: string; specs: string[]; branch: string }
export function archiveFailure(code: string, detail?: string): ArchiveFailure;
export function metadataBlock(text: string, label: string): unknown;
export function strictJson(text: string, limit?: number): unknown;
export function parseImplementation(text: string): ImplementationMetadata | null;
export function parseAcceptance(text: string): AcceptanceMetadata | null;
export function selectAcceptance(comments: readonly unknown[], implementation: ImplementationMetadata, headSha: string): {
  value: AcceptanceMetadata; id: number; author: string; createdAt: string; bodyDigest: string;
};
export function assertMergedImplementation(pull: unknown, repository: string, files: readonly PullRequestChangedFile[], options?: { allowDocumentation?: boolean }): void;
export function assertRepositoryPath(value: unknown): string;
export function inspectTasks(text: string, mapping?: ImplementationMetadata["archivePreparationTasks"], options?: { allowIncomplete?: boolean }): { id: string; done: boolean; text: string }[];
export function completePreparationTask(text: string, mapping: NonNullable<ImplementationMetadata["archivePreparationTasks"]>, kind: keyof typeof ARCHIVE_TASKS): string;
export function archivePaths(change: string, date: string, capabilities: string[]): ArchivePaths;
export function assertArchiveDiff(files: readonly PullRequestChangedFile[], paths: ArchivePaths): void;
