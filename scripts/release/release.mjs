/** Prepare an explicit stable-release draft; only the ordinary human Publish release action authorizes publication. */
import { realpath } from "node:fs/promises";
import { ensurePublicationDependencies } from "../development/dependency-bootstrap.mjs";
import { ReleaseUsageError, parseReleaseArguments } from "./release-arguments.mjs";

/** Injectable command boundary: importing or calling with a fixture runtime never installs dependencies. */
export async function main(args, runtime) {
  try {
    parseReleaseArguments(args);
    const { createReleaseRuntime, runRelease } = await import("./release-workflow.mjs");
    runtime ??= createReleaseRuntime();
    await runRelease(args, runtime);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runtime) runtime.error(message);
    else process.stderr.write(`[release] ${message}\n`);
    return runtime?.signal?.aborted ? 130 : error instanceof ReleaseUsageError ? 2 : 1;
  }
}

if (process.argv[1] && await realpath(new URL(import.meta.url)) === await realpath(process.argv[1]).catch(() => null)) {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error("release canceled; validation keeps running, and rerunning the command resumes waiting for it"));
  process.on("SIGINT", abort); process.on("SIGTERM", abort);
  try {
    const args = process.argv.slice(2);
    parseReleaseArguments(args);
    await ensurePublicationDependencies({ signal: controller.signal });
    controller.signal.throwIfAborted();
    const { createReleaseRuntime } = await import("./release-workflow.mjs");
    process.exitCode = await main(args, createReleaseRuntime({ signal: controller.signal }));
  } catch (error) {
    process.stderr.write(`[release] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = controller.signal.aborted ? 130 : error instanceof ReleaseUsageError ? 2 : 1;
  } finally {
    process.off("SIGINT", abort); process.off("SIGTERM", abort);
  }
}
