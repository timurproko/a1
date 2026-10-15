export interface FinalizationCommit { kind: "restore" | "merge" | "finalize" | "refinalize"; sha: string }
export interface FinalizationResult {
  disposition: "skipped" | "blocked" | "promoted" | "already-finalized" | "finalized" | "refinalized" | "body-updated" | "retry";
  reason?: string;
  head: string | null;
  pushedHead?: string;
  commits: FinalizationCommit[];
  bodyUpdated?: boolean;
  promoted?: boolean;
  archive?: string | null;
}
export function classifyFinalizationCandidate(
  pull: any,
  repository: string,
  options?: { allowDraft?: boolean },
): { skip: string } | {
  draft: boolean;
  implementation: { version: 3; change: string; archive?: string; acceptanceManifest?: string; finalizedHead?: string };
};
export function reconcileFinalization(options: {
  reader: { repository: string; prefix: string; get(path: string): Promise<any> };
  publisher: {
    repository: string;
    actor: string;
    actorEmail?: string;
    token: string | null;
    mutate(path: string, method: string, body?: any): Promise<any>;
    ready(number: number, nodeId: string): Promise<void>;
  };
  number: number;
  toolRoot: string;
  gitImpl?: unknown;
  remoteUrl?: string | null;
  date?: string;
  deadline?: number;
}): Promise<FinalizationResult>;
