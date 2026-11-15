// Rationale: a published predecessor cannot be patched after staging a candidate. This diagnostic-only
// preload observes its original worker, including stderr normally discarded by detached spawning.
import childProcess from "node:child_process";
import { appendFileSync, closeSync, mkdirSync, openSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, resolve } from "node:path";

const directory = process.env.PUBLISHED_PAIR_OBSERVER_DIR;
if (directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const log = value => {
    // Invariant: observation cannot change worker settlement when a diagnostic write fails.
    try { appendFileSync(resolve(directory, `${process.pid}.jsonl`), `${JSON.stringify({ time: new Date().toISOString(), pid: process.pid, parent: process.ppid, ...value })}\n`, { mode: 0o600 }); } catch {}
  };
  const worker = process.argv[2] === "--worker";
  log({ event: "start", entry: basename(process.argv[1] ?? ""), worker });
  process.on("uncaughtExceptionMonitor", error => log({ event: "uncaught", error: String(error?.stack ?? error).slice(-16_000) }));
  process.on("exit", code => log({ event: "exit", code }));
  const spawn = childProcess.spawn;
  childProcess.spawn = function(command, args, options) {
    if (!args?.includes("--worker")) return spawn(command, args, options);
    const fd = openSync(resolve(directory, `worker-stderr-${process.pid}.log`), "a", 0o600);
    let child;
    try { child = spawn(command, args, { ...options, stdio: ["ignore", fd, fd] }); }
    finally { closeSync(fd); }
    child.once("error", error => log({ event: "worker-spawn-error", error: String(error).slice(-4_000) }));
    child.once("exit", (code, signal) => log({ event: "worker-exit", child: child.pid, code, signal }));
    return child;
  };
  syncBuiltinESMExports();
}
