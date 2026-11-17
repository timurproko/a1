import { spawn } from "node:child_process";
import { statSync, realpathSync } from "node:fs";
import { dirname, resolve, isAbsolute, basename } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { locateExecutable } from "./environment-probe.mjs";

/** npm's JavaScript CLI avoids shell quoting and Windows .cmd argument parsing. */
export function resolveNpmCli(env = process.env) {
  const file = value => { try { return value && isAbsolute(value) && basename(value) === "npm-cli.js" && statSync(value).isFile(); } catch { return false; } };
  if (env.npm_execpath) {
    if (file(env.npm_execpath)) return env.npm_execpath;
    throw new Error("npm_execpath does not identify a supported npm CLI; run this command through npm run.");
  }
  const executable = locateExecutable("npm", { env });
  let canonical;
  try { canonical = executable && realpathSync(executable); } catch {}
  const candidates = [canonical, resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    ...(executable ? [resolve(dirname(executable), "node_modules/npm/bin/npm-cli.js"), resolve(dirname(executable), "../lib/node_modules/npm/bin/npm-cli.js")] : [])];
  const found = candidates.find(file);
  if (!found) throw new Error("Cannot locate npm's CLI. Install npm and invoke npm run develop or npm run release again.");
  return found;
}

async function terminateNpm(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await new Promise((done, reject) => {
      const killer = spawn(resolve(process.env.SystemRoot ?? "C:/Windows", "System32/taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true, shell: false });
      const timer = setTimeout(() => { killer.kill(); reject(new Error("Timed out settling the npm process tree.")); }, 5000);
      killer.once("error", error => { clearTimeout(timer); reject(error); });
      killer.once("close", code => { clearTimeout(timer); code === 0 ? done() : reject(new Error("Could not confirm npm process-tree settlement.")); });
    });
    return;
  }
  const signal = name => { try { process.kill(-child.pid, name); } catch (error) { if (error.code !== "ESRCH") throw error; } };
  const running = () => { try { process.kill(-child.pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; } };
  signal("SIGTERM");
  for (let i = 0; i < 60 && running(); i++) await delay(50);
  if (running()) signal("SIGKILL");
  for (let i = 0; i < 40 && running(); i++) await delay(50);
  if (running()) throw new Error("Could not confirm npm process-group settlement.");
}

/** Bounded npm execution; cancellation settles the owned process tree before the caller releases its lock. */
export async function runNpm(args, { cwd, signal, capture = false, env = process.env, npmCli = resolveNpmCli(env), spawnProcess = spawn, terminate = terminateNpm,
  timeoutMs = capture ? 30000 : 10 * 60_000 } = {}) {
  signal?.throwIfAborted();
  return await new Promise((done, reject) => {
    const child = spawnProcess(process.execPath, [npmCli, ...args], { cwd, env: { ...env, npm_config_update_notifier: "false" },
      stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit", windowsHide: true, shell: false, detached: process.platform !== "win32" });
    let stdout = "", bytes = 0, interruption, settlement;
    const stop = reason => {
      if (interruption) return;
      interruption = reason;
      settlement = Promise.resolve().then(() => terminate(child)).then(() => null, error => error);
      settlement.then(error => {
        if (error) { cleanup(); reject(Object.assign(new Error(`${interruption.message} ${error.message} Dependency lock retained; inspect the installer before retrying.`), { settled: false })); }
      });
    };
    const aborted = () => stop(Object.assign(new Error("Dependency setup cancelled."), { name: "AbortError" }));
    const timer = setTimeout(() => stop(new Error("npm dependency setup timed out.")), timeoutMs);
    signal?.addEventListener("abort", aborted, { once: true });
    if (signal?.aborted) aborted();
    child.stdout?.on("data", chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 16 * 1024 * 1024) stop(new Error("npm dependency report exceeded its size limit."));
      else stdout += chunk;
    });
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", aborted); };
    child.once("error", error => { cleanup(); reject(child.pid ? Object.assign(error, { settled: false }) : error); });
    child.once("close", async (code, exitSignal) => {
      cleanup();
      if (interruption) {
        const failure = await settlement;
        reject(failure ? Object.assign(new Error(`${interruption.message} ${failure.message} Dependency lock retained; inspect the installer before retrying.`), { settled: false }) : interruption);
      } else if (exitSignal) reject(new Error(`npm dependency setup stopped by ${exitSignal}.`));
      else done({ code: code ?? 1, stdout });
    });
  });
}
