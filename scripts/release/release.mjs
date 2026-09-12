#!/usr/bin/env node
/**
 * Cut an explicitly selected stable release through manually merged version PRs.
 * npm run release -- patch promotes 0.1.8-dev to 0.1.8; stable 0.1.8 increments to 0.1.9.
 * Verified publication precedes the separate next-patch development PR. This entry never
 * merges a PR, creates a tag, or uploads package bytes from the workstation.
 */
import { pathToFileURL } from "node:url";
import { ReleaseUsageError } from "./release-target.mjs";
import { createReleaseRuntime, runRelease } from "./release-workflow.mjs";

/** Public command boundary, injectable for safe tests that cannot contact live release services. */
export async function main(args, runtime = createReleaseRuntime()) {
  try {
    await runRelease(args, runtime);
    return 0;
  } catch (error) {
    runtime.error(error instanceof Error ? error.message : String(error));
    return runtime.signal?.aborted ? 130 : error instanceof ReleaseUsageError ? 2 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error("release canceled; inspect reported PR/worktree state before retrying"));
  process.on("SIGINT", abort);
  process.on("SIGTERM", abort);
  try {
    process.exitCode = await main(process.argv.slice(2), createReleaseRuntime({ signal: controller.signal }));
  } finally {
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  }
}
