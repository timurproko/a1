import type { ImplementationMetadata } from "./openspec-archive-policy.mjs";
export interface AcceptanceReference { url: string; outcome: string }
export interface AcceptanceTask { id: string; text: string; done: boolean; digest: string; completion: "recorded" | "pending" | "evidenced" | "signoff-on-merge" | "archive-preparation"; evidence: AcceptanceReference[] }
export interface AcceptanceRecord {
  version: 1; repository: string; change: string; sourcePr: number; sourceHead: string; sourceMerge: string;
  sourceBodyDigest: string; artifactDigest: string; specBaseSha: string;
  validation: { runId: number; headSha: string; checkedSha: string; attempt: number } | null;
  tasks: AcceptanceTask[];
  review: { decision: "accept-on-manual-merge" | "known-gaps"; evidence: AcceptanceReference[]; gaps: string[] };
}
export const ACCEPTANCE_ROOT: string;
export const ACCEPTANCE_SIGNOFF: string;
export function digest(value: string | Buffer): string;
export function requireAcceptance(value: unknown, code: string): asserts value;
export function acceptancePath(record: Pick<AcceptanceRecord, "change" | "sourceHead">): string;
export function acceptanceBranch(record: Pick<AcceptanceRecord, "change" | "sourcePr">): string;
export function acceptanceBytes(record: AcceptanceRecord): string;
export function artifactDigest(snapshot: { entries: Map<string, string> }, change: string): string;
export function taskInventory(text: string, mapping?: ImplementationMetadata["archivePreparationTasks"]): AcceptanceTask[];
export function parseAcceptanceRecord(bytes: string): AcceptanceRecord;
export function acceptanceBlockers(record: AcceptanceRecord): string[];
export function verifyRecordBindings(record: AcceptanceRecord, source: any, snapshot: { entries: Map<string, string> }, text: string, repository: string): void;
export function reconcileAcceptanceTasks(text: string, receipt: any, mapping: ImplementationMetadata["archivePreparationTasks"]): string;
export function assertAcceptanceDiff(pull: any, files: any[], path: string, repository: string): void;
export function assertManualAcceptanceMerge(pull: any, permission: string, events: any[]): void;
export function receiptIdentity(receipt: any): any;
export function acceptanceUrl(repository: string, sourcePr: number, receipt: any): string;
export function retainedAcceptance(receipt: any): string;
export function archivedAcceptanceMatches(text: string | undefined, source: any, repository: string): boolean;
