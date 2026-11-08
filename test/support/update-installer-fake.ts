import { resolve } from "node:path";
import type { UpdateProcessRunner } from "../../src/foundation/release/update.js";
import type { UpdateInstaller } from "../../src/foundation/release/update-installer.js";
import { updateNpmInstallArguments, type ProtectedPackageReplacementResult } from "../../src/foundation/release/update-recovery.js";

/** What the fake rollback reports; it is not "rolled back", so a failed update finishes as failed. */
export const FAKE_ROLLBACK_RESULT = "prior release retained by the test installer";

/**
 * An installer that changes nothing on disk: preflight resolves no npm entry, the prior release is
 * a fixed approved record, and package replacement runs `npm install` through the scripted runner
 * so tests observe the same npm invocation and exit code the protected replacement would see.
 */
export function fakeUpdateInstaller(runner: () => UpdateProcessRunner, overrides: Partial<UpdateInstaller> = {}): UpdateInstaller {
  return {
    preflight: async () => undefined,
    protectPriorRelease: async packageRoot => ({
      priorActiveReleaseId: null,
      approvedRelease: releaseId => ({ releaseId: releaseId ?? "test-prior-release", releaseRoot: packageRoot, contentDigest: "0".repeat(64) }),
    }),
    replacePackage: async input => {
      const transactionId = input.transaction.transactionId;
      const result = await runner()("npm", updateNpmInstallArguments(input.globalRoot, input.transaction.targetVersion), { captureStdout: true });
      return replacementResult(transactionId, result.code, result.stdout, result.stderr ?? "");
    },
    rollback: async () => FAKE_ROLLBACK_RESULT,
    maintenance: async () => {},
    ...overrides,
  };
}

/** A protected-replacement result for `outcome`, as the recovery worker reports it. */
export function replacementResult(
  transactionId: string,
  npmExitCode: number | null,
  stdout = "",
  stderr = "",
  outcome: ProtectedPackageReplacementResult["outcome"] = npmExitCode === 0 ? "installed" : "failed",
  cancelled = false,
): ProtectedPackageReplacementResult {
  const installed = outcome === "installed";
  return {
    schema: "a1-update-recovery-v1",
    transactionId,
    outcome,
    npmExitCode,
    cancelled,
    launcherDisposition: installed ? "target" : outcome === "recovery-launcher" ? "recovery" : "unavailable",
    stdout,
    stderr,
    completedAt: new Date(0).toISOString(),
    recovery: {
      capsulePath: resolve("fixtures", "data", "update-recovery", "test", "capsule.json"),
      status: installed ? "package-installed" : "recovery-launcher",
      guardianPid: 42,
      guardianStartIdentity: "42:start",
      cancellationRequested: cancelled,
      launcherDisposition: installed ? "target" : "recovery",
    },
  };
}
