import { spawnReleaseEntry } from "./release-use.js";
import { resolveReleaseEntryPoint, type MaterializedRelease } from "./release-store.js";
import { releaseEnvironment } from "./bootstrap.js";
import { launchContractTarget, launchEnvironmentKeys } from "../launch-context/index.js";

const WARMUP_DIAGNOSTIC_LIMIT = 2_000;

/** Summarize the child's own failure text without letting an unbounded graph error escape. */
function warmupDiagnostics(text: string): string {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  return lines.length === 0 ? "" : `: ${lines.slice(0, 4).join(" | ").slice(0, WARMUP_DIAGNOSTIC_LIMIT)}`;
}

/** Import the exact immutable startup graph in a terminal-free bounded child process. */
export async function warmMaterializedRelease(
  release: MaterializedRelease,
  environment: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
): Promise<void> {
  const entry = await resolveReleaseEntryPoint(release, "bin/warmup.js");
  const child = await spawnReleaseEntry(entry, [], {
    env: { ...releaseEnvironment(environment, release), [launchEnvironmentKeys(launchContractTarget(release)).immutableWarmup!]: "1" },
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    // Rationale: bounded diagnostics explain graph-import failures without attaching a terminal.
    let diagnostics = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", chunk => { diagnostics = `${diagnostics}${chunk}`.slice(-WARMUP_DIAGNOSTIC_LIMIT); });
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectPromise(error);
      else resolvePromise();
    };
    child.once("error", error => finish(error));
    child.once("close", (code, signal) => finish(code === 0
      ? undefined
      : new Error(`immutable startup warmup exited with ${code === null ? signal ?? "unknown status" : `status ${code}`}${warmupDiagnostics(diagnostics)}`)));
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`immutable startup warmup exceeded ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
  });
}
