export const FULL_LANES: readonly string[];
export interface FullContext { head: string; base: string; pr: number; selectionId: string; runId: string; runAttempt: number }
export interface FullTierResult { schema: string; passed: boolean; requested: string[]; selected: string[]; outcomes: { id?: string; exitCode: number; scopes: string[]; skipped?: string }[] }
export interface FullLane extends FullContext { schema: string; lane: string; result: FullTierResult }
export function fullContext(environment: NodeJS.ProcessEnv): FullContext;
export function bindFullLane(context: FullContext, lane: string, result: FullTierResult): FullLane;
export function requireFullLanes(context: FullContext, records: FullLane[], jobsResult: string): FullContext & { schema: string; passed: boolean; lanes: string[] };
