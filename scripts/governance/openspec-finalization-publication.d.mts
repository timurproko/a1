export interface FinalizationCommit { kind: "restore" | "merge" | "finalize" | "refinalize"; sha: string }
export interface FinalizationResult {
  disposition: "skipped" | "already-finalized" | "finalized" | "refinalized" | "body-updated" | "retry";
  reason?: string;
  head: string | null;
  pushedHead?: string;
  commits: FinalizationCommit[];
  bodyUpdated?: boolean;
  archive?: string | null;
}
export function classifyFinalizationCandidate(pull: any, repository: string): { skip: string } | { implementation: { version: 3; change: string; archive?: string; acceptanceManifest?: string } };
export function reconcileFinalization(options: {
  reader: { repository: string; prefix: string; get(path: string): Promise<any> };
  publisher: { repository: string; actor: string; actorEmail?: string; token: string | null; mutate(path: string, method: string, body?: any): Promise<any> };
  number: number;
  toolRoot: string;
  gitImpl?: unknown;
  remoteUrl?: string | null;
  date?: string;
  deadline?: number;
}): Promise<FinalizationResult>;
