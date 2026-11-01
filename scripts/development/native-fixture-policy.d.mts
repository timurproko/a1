export const NATIVE_FIXTURE_POLICY: "reviewed-isolated-ci-v1";
export interface NativeFixtureReceipt {
  schema: typeof NATIVE_FIXTURE_POLICY;
  head: string;
  runId: string;
  runAttempt: string;
  environment: "native-fixture-security-review";
  disposable: true;
  credentials: "none";
  egress: "loopback-only";
  securityReview: "approved";
  defenderRealtime?: true;
}
export function assertNativeFixtureContext(environment: NodeJS.ProcessEnv, receipt: unknown): asserts receipt is NativeFixtureReceipt;
export function requireNativeFixtureContext(environment?: NodeJS.ProcessEnv): Promise<NativeFixtureReceipt>;
