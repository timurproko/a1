import type { IsolationPlan } from "./native-fixture-isolation-plan.mjs";
export interface UnixIsolationState extends IsolationPlan {
  user: string;
  uid: number;
  gid?: number;
  profile: string;
  networkNamespace?: string;
  environment: Record<string, string>;
}
export function prepareUnixIsolation(state: UnixIsolationState): Promise<void>;
export function unixInvocation(
  state: UnixIsolationState,
  request: string,
): { command: string; args: string[] };
export function shareUnixRequest(
  state: UnixIsolationState,
  request: string,
): Promise<void>;
export function cleanupUnixIsolation(state: UnixIsolationState): Promise<void>;
