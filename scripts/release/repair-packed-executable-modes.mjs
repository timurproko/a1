import { gunzipSync, gzipSync } from "node:zlib";
import { entryFingerprint, walkTarEntries, writeHeaderMode } from "./packed-tar.mjs";

const EXECUTABLE_MODE = 0o755;
const EXECUTABLE_BITS = 0o111;

/** Restore explicitly named script modes after packing on a host without POSIX permissions. */
export function repairPackedExecutableModes(tarball, executablePaths) {
  if (!Array.isArray(executablePaths) || executablePaths.length < 1 || executablePaths.length > 64
    || executablePaths.some(path => typeof path !== "string" || !/^package\/[A-Za-z0-9._/-]+$/u.test(path) || path.includes("../"))) {
    throw new Error("packed executable mode repair paths are invalid");
  }
  const archive = gunzipSync(tarball);
  const entries = walkTarEntries(archive);
  const repaired = [];
  for (const path of new Set(executablePaths)) {
    const entry = entries.find(candidate => candidate.path === path);
    if (!entry) throw new Error(`packed executable is missing: ${path}`);
    if ((entry.mode & EXECUTABLE_BITS) !== 0) continue;
    writeHeaderMode(archive, entry.headerOffset, EXECUTABLE_MODE);
    repaired.push(path);
  }
  if (repaired.length === 0) return { bytes: tarball, repaired };
  const before = entries.map(entry => entryFingerprint(entry));
  const reparsed = walkTarEntries(archive).map(entry => entryFingerprint(entry));
  if (JSON.stringify(reparsed) !== JSON.stringify(before)) {
    throw new Error("packed executable mode repair altered tarball content beyond executable modes");
  }
  return { bytes: gzipSync(archive), repaired };
}
