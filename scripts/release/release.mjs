/**
 * Cut an explicitly selected stable release from the open development source.
 * npm run release -- patch promotes 0.1.8-dev to 0.1.8 without committing that version.
 * Preparation creates an editable draft GitHub Release, starts validation of its source,
 * and waits for it before showing the draft to edit. Choosing Publish release on that draft publishes npm in trusted CI; this entry
 * never publishes the GitHub Release, creates a tag, or mutates the reopening development branch.
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
  const abort = () => controller.abort(new Error("release canceled; validation keeps running, and rerunning the command resumes waiting for it"));
  process.on("SIGINT", abort);
  process.on("SIGTERM", abort);
  try {
    process.exitCode = await main(process.argv.slice(2), createReleaseRuntime({ signal: controller.signal }));
  } finally {
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  }
}
