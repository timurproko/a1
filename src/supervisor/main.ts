import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import type { TerminalDriver } from "../domain/index.js";
import { assertImmutableExecutionRoot, readMaterializedRelease } from "../release-store.js";
import { ControlStore } from "../storage/index.js";
import { resolveAddOnePaths } from "./paths.js";
import { SupervisorServer } from "./server.js";

export async function runSupervisor(): Promise<void> {
  const paths = resolveAddOnePaths();
  mkdirSync(paths.runtimeDir, { recursive: true, mode: 0o700 });
  const log = (message: string) => appendFileSync(paths.supervisorLogPath, `${new Date().toISOString()} ${message}\n`);
  const releaseRoot = process.env.ADDONE_RELEASE_ROOT;
  if (!releaseRoot) throw new Error("supervisor must be launched from a verified immutable AddOne release");
  const release = await readMaterializedRelease(releaseRoot);
  if (process.env.ADDONE_RELEASE_ID !== release.releaseId) throw new Error("selected AddOne release identity does not match its verified manifest");
  await assertImmutableExecutionRoot(release, paths.dataDir);
  const bootNonce = randomUUID();
  const store = new ControlStore(paths.databasePath, bootNonce);
  const unavailableTerminalDriver: TerminalDriver = {
    async start() {
      throw new Error("terminal capability is unavailable during redesign");
    },
  };
  const server = new SupervisorServer(store, unavailableTerminalDriver, paths, release, bootNonce);
  await server.listen();
  log(`supervisor ${server.id} listening at ${paths.endpoint} (pid ${process.pid})`);

  let closing = false;
  const close = async (signal: string) => {
    if (closing) return;
    closing = true;
    log(`received ${signal}; stopping supervised process tree`);
    await server.close(true);
    process.exitCode = 0;
  };
  process.on("SIGINT", () => void close("SIGINT"));
  process.on("SIGTERM", () => void close("SIGTERM"));
  process.on("uncaughtException", error => {
    log(`uncaught exception: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
  process.on("unhandledRejection", error => log(`unhandled rejection: ${String(error)}`));
}
