export const FULL_LANES: readonly string[];
export interface FullContext { head: string; base: string; pr: number; selectionId: string; runId: string; runAttempt: number }
export interface FullTierResult { schema: string; passed: boolean; requested: string[]; selected: string[]; outcomes: { id?: string; exitCode: number; scopes: string[]; skipped?: string }[] }
export interface FullLane extends FullContext { schema: string; lane: string; result: FullTierResult }
export function fullContext(environment: NodeJS.ProcessEnv): FullContext;
export function bindFullLane(context: FullContext, lane: string, result: FullTierResult): FullLane;
export function requireFullLanes(context: FullContext, records: FullLane[], jobsResult: string): FullContext & { schema: string; passed: boolean; lanes: string[] };
export const SHARDED_FULL_LANES: readonly string[];
export interface FullShardResult extends Omit<FullTierResult, "outcomes"> {
  startedAt: number;
  completedAt: number;
  exactPackagePreparation?: Record<string, unknown> | null;
  structuralEvidence?: Record<string, unknown>;
  outcomes: { id: string; exitCode: number; scopes: string[]; skipped?: string; durationMs?: number }[];
  fullShard: import("./validation-tier.mjs").FullRegressionShardIdentity;
}
export interface FullShardRecord extends FullContext { schema: string; lane: string; shard: string; result: FullShardResult }
export function bindFullShard(context: FullContext, lane: string, shard: string, result: FullShardResult): FullShardRecord;
export function mergeFullShards(context: FullContext, lane: string, partition: import("./validation-tier.mjs").FullRegressionPartition, records: FullShardRecord[]): Omit<FullTierResult, "outcomes"> & {
  startedAt: number;
  completedAt: number;
  fullShards: { schema: string; planDigest: string; elapsedMs: number; runnerMs: number; shards: { id: string; startedAt: number; completedAt: number; durationMs: number; work: string[] }[] };
  outcomes: { id: string; exitCode: number; scopes: string[]; shard: string }[];
};
