import type { ArchiveReader } from "./openspec-archive-github.mjs";
import type { AcceptanceRecord } from "./openspec-acceptance-policy.mjs";
export function mapWithConcurrency<T, R>(items: T[], limit: number, operation: (item: T, index: number) => Promise<R>): Promise<R[]>;
export function prepareAcceptanceRequest(reader: ArchiveReader, source: any): Promise<{ record: AcceptanceRecord; targetSha: string; blockers: string[] }>;
export function verifyAcceptanceRecord(reader: ArchiveReader, record: AcceptanceRecord, source: any, options?: { requireComplete?: boolean }): Promise<void>;
export function acceptancePulls(reader: ArchiveReader, record: AcceptanceRecord): Promise<any[]>;
export function inspectAcceptanceCandidate(reader: ArchiveReader, pull: any, options?: { requireComplete?: boolean }): Promise<any>;
export function loadPullRequestAcceptance(reader: ArchiveReader, source: any): Promise<any>;
export function validateAcceptanceCandidate(reader: ArchiveReader, number: number): Promise<any>;
