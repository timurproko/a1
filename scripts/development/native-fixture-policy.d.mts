export const NATIVE_FIXTURE_POLICY: "isolated-ci-v2";
export interface NativeFixtureReceipt {
  schema: typeof NATIVE_FIXTURE_POLICY;
  head: string;
  runId: string;
  runAttempt: string;
  disposable: true;
  credentials: "none";
  egress: "loopback-only";
  defenderRealtime?: true;
}
export function assertNativeFixtureContext(environment: NodeJS.ProcessEnv, receipt: unknown): asserts receipt is NativeFixtureReceipt;
export function requireNativeFixtureContext(environment?: NodeJS.ProcessEnv): Promise<NativeFixtureReceipt>;
