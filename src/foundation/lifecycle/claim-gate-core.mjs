import { randomUUID } from "node:crypto";
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const identity = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;

/** Non-expiring exclusive creation: suspension, process death and event-loop stalls never transfer authority. */
export function tryAcquireClaimGate(path) {
  const gate = `${path}.gate`;
  let descriptor;
  try { descriptor = openSync(gate, "wx", 0o600); }
  catch (cause) {
    if (cause?.code === "EEXIST") return null;
    throw Object.assign(new Error("cannot access the worktree mutation gate", { cause }), { code: "worktree-coordination-io" });
  }
  const nonce = randomUUID(), fingerprint = identity(fstatSync(descriptor));
  try { writeFileSync(descriptor, JSON.stringify({ nonce, pid: process.pid })); }
  catch (error) { closeSync(descriptor); throw error; } // Security: an incomplete gate remains blocking, never guessed abandoned.
  let released = false;
  return { path: gate, nonce,
    release() {
      if (released) return;
      released = true;
      try {
        const stat = lstatSync(gate);
        if (!stat.isFile() || stat.isSymbolicLink() || identity(stat) !== fingerprint || JSON.parse(readFileSync(gate, "utf8")).nonce !== nonce) {
          throw Object.assign(new Error("worktree gate identity changed; retained for inspection"), { code: "worktree-coordination-boundary" });
        }
        let pending = [];
        try {
          const children = lstatSync(`${gate}.children`);
          if (!children.isDirectory() || children.isSymbolicLink()) throw Object.assign(new Error("cleanup child metadata is linked or malformed; gate retained"), { code: "worktree-coordination-boundary" });
          pending = readdirSync(`${gate}.children`);
        } catch (error) { if (error.code !== "ENOENT") throw error; }
        if (pending.length) throw Object.assign(new Error("cleanup descendants are not proven stopped; the non-expiring gate was retained"), { code: "worktree-cleanup-child-unverifiable" });
        unlinkSync(gate);
      } finally { closeSync(descriptor); }
    },
  };
}

/** Publish intent before spawning: parent death can never leave an unrecorded destructive descendant. */
export function trackClaimGateChild(reservation) {
  const directory = `${reservation.authority}.children`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("invalid cleanup child boundary");
  const path = join(directory, randomUUID());
  writeFileSync(path, JSON.stringify({ nonce: reservation.nonce, pid: process.pid }), { flag: "wx", mode: 0o600 });
  return () => unlinkSync(path);
}
