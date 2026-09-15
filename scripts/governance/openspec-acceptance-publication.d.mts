import type { AcceptanceRecord } from "./openspec-acceptance-policy.mjs";
import type { ArchiveReader } from "./openspec-archive-github.mjs";
export function acceptancePullTitle(record: AcceptanceRecord, sourceTitle?: string): string;
export function acceptancePullBody(record: AcceptanceRecord, sourceTitle?: string): string;
export function publishAcceptanceRequest(options: { reader: ArchiveReader; publisher?: any; source: any;
  candidate: { record: AcceptanceRecord; targetSha: string; blockers: string[] }; dryRun?: boolean; retryClosed?: boolean }): Promise<any>;
