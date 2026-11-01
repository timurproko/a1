import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const NATIVE_FIXTURE_POLICY = "reviewed-isolated-ci-v1";

/** Safety interlock, not a sandbox: the protected runner must supply real OS isolation. */
export function assertNativeFixtureContext(environment, receipt) {
  const head = environment.NATIVE_FIXTURE_HEAD ?? environment.GITHUB_SHA;
  if (environment.GITHUB_ACTIONS !== "true" || !/^[1-9]\d*$/u.test(environment.GITHUB_RUN_ID ?? "") ||
      !/^[1-9]\d*$/u.test(environment.GITHUB_RUN_ATTEMPT ?? "") || !/^[a-f\d]{40}$/u.test(head ?? "")) {
    throw new Error("Native process fixtures are CI-only; use npm run check:local. Do not restore quarantined executables.");
  }
  if (receipt?.schema !== NATIVE_FIXTURE_POLICY || receipt.head !== head ||
      receipt.runId !== environment.GITHUB_RUN_ID || receipt.runAttempt !== environment.GITHUB_RUN_ATTEMPT ||
      receipt.disposable !== true || receipt.credentials !== "none" || receipt.egress !== "loopback-only" ||
      receipt.securityReview !== "approved" || receipt.environment !== "native-fixture-security-review" ||
      ((process.platform === "win32" || environment.RUNNER_OS === "Windows") && receipt.defenderRealtime !== true)) {
    throw new Error("Native fixture isolation/review is unavailable for this exact run; native evidence remains blocked, not skipped.");
  }
}

/** Read a run-bound provisioner receipt; never manufacture approval from CI=1 or passing tests. */
export async function requireNativeFixtureContext(environment = process.env) {
  const file = environment.NATIVE_FIXTURE_ISOLATION_RECEIPT;
  let receipt;
  try { if (file) receipt = JSON.parse(await readFile(file, "utf8")); } catch { /* Security: invalid proof is rejected below. */ }
  assertNativeFixtureContext(environment, receipt);
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await requireNativeFixtureContext();
}
