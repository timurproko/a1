import { appendFileSync, mkdirSync } from "node:fs";
import { NativePiTerminalDriver } from "../drivers/terminal/index.js";
import { ControlStore } from "../storage/index.js";
import { resolveAddOnePaths } from "./paths.js";
import { SupervisorServer } from "./server.js";

export async function runSupervisor(): Promise<void> {
  const paths = resolveAddOnePaths();
  mkdirSync(paths.runtimeDir, { recursive: true, mode: 0o700 });
  const log = (message: string) => appendFileSync(paths.supervisorLogPath, `${new Date().toISOString()} ${message}\n`);
  const store = new ControlStore(paths.databasePath);
  const server = new SupervisorServer(store, new NativePiTerminalDriver(), paths);
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
