import { spawn } from "node:child_process";
import { resolveReleaseEntryPoint, type MaterializedRelease } from "./release-store.js";
import { releaseEnvironment } from "./bootstrap.js";
import { PRIVATE_ENVIRONMENT, assertCurrentLaunchContract } from "../launch-context/index.js";

/** Import the exact immutable startup graph in a terminal-free bounded child process. */
export async function warmMaterializedRelease(
  release: MaterializedRelease,
  environment: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
): Promise<void> {
  assertCurrentLaunchContract(release);
  const entry = await resolveReleaseEntryPoint(release, "bin/warmup.js");
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [entry], {
      env: { ...releaseEnvironment(environment, release), [PRIVATE_ENVIRONMENT.immutableWarmup]: "1" },
      stdio: "ignore",
      windowsHide: true,
    });
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
      : new Error(`immutable startup warmup exited with ${code === null ? signal ?? "unknown status" : `status ${code}`}`)));
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`immutable startup warmup exceeded ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
  });
}
