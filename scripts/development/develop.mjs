#!/usr/bin/env node
/** Request the authoritative numbered preview after dependency readiness is established. */
import { readFile, realpath } from "node:fs/promises";
import { ensurePublicationDependencies } from "./dependency-bootstrap.mjs";

/** Side-effect-free import boundary; publication services load only when the command is invoked. */
export async function main({ signal } = {}) {
  signal?.throwIfAborted();
  const { authoritativeDevelopHead, publishDevelopmentPreview, resolveDevelopPreview } = await import("../release/publication-client.mjs");
  signal?.throwIfAborted();
  const source = await authoritativeDevelopHead();
  const preview = await resolveDevelopPreview(source);
  const installer = JSON.parse(await readFile(new URL("../../packages/a1-install/package.json", import.meta.url), "utf8"));
  await publishDevelopmentPreview(preview, installer.name, { signal });
}

if (process.argv[1] && await realpath(new URL(import.meta.url)) === await realpath(process.argv[1]).catch(() => null)) {
  const controller = new AbortController(), abort = () => controller.abort(new Error("develop command cancelled"));
  process.on("SIGINT", abort); process.on("SIGTERM", abort);
  try {
    await ensurePublicationDependencies({ signal: controller.signal });
    await main({ signal: controller.signal });
  } catch (error) {
    process.stderr.write(`[develop] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = controller.signal.aborted ? 130 : 1;
  } finally {
    process.off("SIGINT", abort); process.off("SIGTERM", abort);
  }
}
