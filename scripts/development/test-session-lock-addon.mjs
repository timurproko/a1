import { spawn } from "node:child_process";
import { copyFile, link, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { platform } from "node:os";
import { resolve } from "node:path";

const root = resolve(".artifacts/terminal-host/addon-test");
const modulePath = resolve(".artifacts/terminal-host/a1_session_lock.node");
const built = resolve("native/terminal-host/target/debug", platform() === "win32" ? "terminal_host_contracts.dll" : platform() === "darwin" ? "libterminal_host_contracts.dylib" : "libterminal_host_contracts.so");

if (process.argv[2] === "--holder") {
  const addon = createRequire(import.meta.url)(modulePath);
  const lock = addon.SessionLock.acquire(process.argv[3]);
  const descendant = spawn(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { detached: true, stdio: "ignore", windowsHide: true });
  descendant.unref();
  await writeFile(process.argv[4], `${descendant.pid}\n`);
  process.on("SIGTERM", () => process.exit(0));
  setInterval(() => void lock.bound, 1_000);
  await new Promise(() => {});
}

await mkdir(root, { recursive: true });
await copyFile(built, modulePath);
const addon = createRequire(import.meta.url)(modulePath);
if (typeof addon.SessionLock?.acquire !== "function") throw new Error("Node-API SessionLock export is unavailable");

const newSession = resolve(root, "new-session.jsonl");
await rm(newSession, { force: true });
const reservation = addon.SessionLock.acquire(newSession);
if (reservation.bound) throw new Error("new session was bound before creation");
await writeFile(newSession, "");
reservation.bindCreated(newSession);
if (!reservation.bound) throw new Error("new session did not bind its file identity");
let contended = false;
try { addon.SessionLock.acquire(newSession); } catch { contended = true; }
if (!contended) throw new Error("second in-process writer acquired a held session");
const hardAlias = resolve(root, "new-session-hard-link.jsonl");
await rm(hardAlias, { force: true });
await link(newSession, hardAlias);
contended = false;
try { addon.SessionLock.acquire(hardAlias); } catch { contended = true; }
if (!contended) throw new Error("hard-link alias bypassed the held session identity");
reservation.release();
addon.SessionLock.acquire(hardAlias).release();

const realDirectory = resolve(root, "real-directory");
const directoryAlias = resolve(root, "directory-alias");
await rm(directoryAlias, { recursive: true, force: true });
await mkdir(realDirectory, { recursive: true });
const aliasedSession = resolve(realDirectory, "aliased.jsonl");
await writeFile(aliasedSession, "");
await symlink(realDirectory, directoryAlias, platform() === "win32" ? "junction" : "dir");
const aliasLock = addon.SessionLock.acquire(aliasedSession);
contended = false;
try { addon.SessionLock.acquire(resolve(directoryAlias, "aliased.jsonl")); } catch { contended = true; }
if (!contended) throw new Error("symbolic or junction alias bypassed the held session identity");
if (platform() === "win32") {
  contended = false;
  try { addon.SessionLock.acquire(aliasedSession.toUpperCase()); } catch { contended = true; }
  if (!contended) throw new Error("case alias bypassed the held session identity");
}
aliasLock.release();

const heldSession = resolve(root, "held-session.jsonl");
const ready = resolve(root, "holder.ready");
await writeFile(heldSession, "");
await rm(ready, { force: true });
const child = spawn(process.execPath, [import.meta.filename, "--holder", heldSession, ready], { stdio: "inherit", windowsHide: true });
const descendantPid = await waitForPid(ready, 5_000);
contended = false;
try { addon.SessionLock.acquire(heldSession); } catch { contended = true; }
if (!contended) throw new Error("second Node process acquired a held session");
child.kill("SIGTERM");
await new Promise((resolveExit, reject) => {
  const timer = setTimeout(() => reject(new Error("lock holder did not exit")), 5_000);
  child.once("exit", () => { clearTimeout(timer); resolveExit(); });
});
try { process.kill(descendantPid, 0); } catch { throw new Error("holder descendant did not survive its parent"); }
addon.SessionLock.acquire(heldSession).release();
try { process.kill(descendantPid, "SIGTERM"); } catch {}
console.log("Session lock Node-API aliases, bind continuity, process-death release, and non-inherited grandchild custody OK");

async function waitForPid(path, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const pid = Number.parseInt((await readFile(path, "utf8")).trim(), 10);
      if (Number.isSafeInteger(pid)) return pid;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 20));
  }
  throw new Error(`timed out waiting for a descendant pid in ${path}`);
}
