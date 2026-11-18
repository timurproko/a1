import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstatSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./claim-gate-witness.ps1", import.meta.url));
const args = ["-NoProfile", "-NonInteractive", "-File", script];
let own, nativeEnvironment;
const volumes = new Set();
const physical = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeNs}`;
function nativeOptions() {
  // Platform: PowerShell/Add-Type caches belong to disposable coordination storage, never the caller's runtime/profile namespace.
  if (!nativeEnvironment) {
    const root = mkdtempSync(join(tmpdir(), "worktree-gate-native-"));
    nativeEnvironment = { ...process.env, HOME: root, USERPROFILE: root, LOCALAPPDATA: root, APPDATA: root, TEMP: root, TMP: root,
      DOTNET_CLI_HOME: root, PSModuleAnalysisCachePath: join(root, "module-cache"), POWERSHELL_TELEMETRY_OPTOUT: "1" };
  }
  return { env: nativeEnvironment, windowsHide: true, timeout: 15_000, encoding: "utf8" };
}

/** SQLite byte locks and durable receipts are supported only on verified local fixed NTFS storage. */
export function assertClaimGateVolume(path) {
  const volume = parse(resolve(path)).root.toLowerCase();
  if (process.platform !== "win32" || process.arch !== "x64" || !/^[a-z]:\\$/u.test(volume)) throw boundary("unsupported gate storage volume/platform");
  if (!volumes.has(volume)) {
    const result = execFileSync("powershell.exe", [...args, "volume", "volume", "0", path], nativeOptions());
    if (result.trim() !== "supported") throw boundary("gate storage could not be verified");
    volumes.add(volume);
  }
}
const pause = new Int32Array(new SharedArrayBuffer(4));
const boundary = message => Object.assign(new Error(message), { code: "worktree-gate-unverifiable" });

/** A separate observer retains the Job handle through holder death; absence alone is never evidence. */
export function claimGateLifetime() {
  if (process.platform !== "win32") return null;
  if (own) return own;
  // Compatibility: initialize libuv's self-containing kill-on-close Job before the observer snapshots its handles.
  execFileSync(process.execPath, ["-e", ""], { windowsHide: true, timeout: 15_000 });
  assertClaimGateVolume(tmpdir());
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "worktree-gate-witness-"))), job = `Local\\WorktreeGate-${randomUUID()}`;
  execFileSync("powershell.exe", [...args, "launch", job, String(process.pid), directory], nativeOptions());
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      const proof = readProof(join(directory, "ready.json"));
      if (proof.job !== job || proof.holder !== process.pid) throw boundary("lifetime observer returned another holder");
      own = Object.freeze({ ...proof, directory, physical: physical(lstatSync(directory, { bigint: true })) }); return own;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (Date.now() >= deadline) throw boundary(`Windows lifetime observer unavailable; no authority granted. Check script/native API permissions and ${directory}`);
    Atomics.wait(pause, 0, 0, 10);
  }
}
function readProof(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 4096) throw boundary("linked or malformed lifetime proof");
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Positive job-empty receipt or a different kernel boot, not PID absence, proves all old execution stopped. */
export function inspectClaimGateLifetime(proof) {
  if (process.platform !== "win32" || proof?.schema !== "claim-gate-witness-v1"
    || !/^Local\\WorktreeGate-[a-f0-9-]{36}$/u.test(proof.job) || !/^[a-f0-9-]{36}$/u.test(proof.boot)
    || !Number.isSafeInteger(proof.holder) || proof.holder <= 0 || !Number.isSafeInteger(proof.observer) || proof.observer <= 0 || typeof proof.directory !== "string") throw boundary("unsupported gate lifetime format/platform");
  const observed = JSON.parse(execFileSync("powershell.exe", [...args, "inspect", proof.job, "0", ""], nativeOptions()));
  if (!/^[a-f0-9-]{36}$/u.test(observed.boot)) throw boundary("kernel boot identity unavailable");
  if (observed.present) {
    if (!Array.isArray(observed.members)) throw boundary("job membership unavailable");
    if (observed.members.length) return observed.members.includes(proof.holder) ? "live" : "surviving-descendant";
  }
  if (observed.boot !== proof.boot) return "recoverable";
  // Security: a lost observer/name does not prove process death. Only its durable positive receipt does.
  const directory = lstatSync(proof.directory, { bigint: true });
  if (!directory.isDirectory() || directory.isSymbolicLink() || physical(directory) !== proof.physical || resolve(realpathSync(proof.directory)) !== resolve(proof.directory)) throw boundary("lifetime proof directory changed");
  let done;
  try { done = readProof(join(proof.directory, "stopped.json")); }
  catch (error) { if (error.code === "ENOENT") throw boundary("lifetime observer has no completion receipt; retry after observation, or after a verified reboot if the observer was lost"); throw error; }
  if (Object.keys(done).length !== 5 || ["schema", "job", "boot", "holder", "observer"].some(key => done[key] !== proof[key])) throw boundary("lifetime completion receipt differs from approval");
  return "recoverable";
}
