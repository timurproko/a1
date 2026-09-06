import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { MaterializedRelease } from "./release-store.js";
import { releaseEnvironment } from "./bootstrap.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

/** Import the exact immutable startup graph in a terminal-free bounded child process. */
export async function warmMaterializedRelease(
  release: MaterializedRelease,
  environment: NodeJS.ProcessEnv,
  timeoutMs = 30_000,
): Promise<void> {
  const entry = resolve(release.releaseRoot, "bin", "warmup.js");
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [entry], {
      env: { ...releaseEnvironment(environment, release), [PRODUCT_IDENTITY.environment.immutableWarmup]: "1" },
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
