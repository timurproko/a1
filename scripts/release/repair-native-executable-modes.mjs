import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { guardianBinaryReference } from "../governance/candidate-evidence.mjs";
import { entryFingerprint, walkTarEntries, writeHeaderMode } from "./packed-tar.mjs";

// Platform: a pack host without posix permissions (Windows) records every packed file
// without executable bits, which would leave the bundled native process guardian
// unspawnable on linux and darwin. The per-platform guardian build manifests packed
// beside the binaries are the authority for which entries must be executable.
const GUARDIAN_MANIFEST_PATH = /^package\/dist\/native\/[^/]+\/manifest\.json$/;
const EXECUTABLE_MODE = 0o755;
const EXECUTABLE_BITS = 0o111;

/** Restore packed native process guardian executability after a host-independent pack. */
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

export function repairNativeExecutableModes(tarball) {
  const archive = gunzipSync(tarball);
  const entries = walkTarEntries(archive);
  const repaired = [];
  for (const entry of entries) {
    if (!GUARDIAN_MANIFEST_PATH.test(entry.path)) continue;
    const reference = guardianBinaryReference(entry.path, entry.content);
    if (reference === null) continue;
    const binary = entries.find(candidate => candidate.path === reference.binaryPath);
    if (!binary) throw new Error(`guardian manifest ${entry.path} declares missing binary ${reference.binaryPath}`);
    const digest = createHash("sha256").update(binary.content).digest("hex");
    if (binary.size !== reference.size || digest !== reference.sha256) {
      throw new Error(`guardian binary ${reference.binaryPath} differs from its packed build manifest`);
    }
    if ((binary.mode & EXECUTABLE_BITS) !== 0) continue;
    writeHeaderMode(archive, binary.headerOffset, EXECUTABLE_MODE);
    repaired.push(binary.path);
  }
  if (repaired.length === 0) return { bytes: tarball, repaired };
  const before = entries.map(entry => entryFingerprint(entry));
  const reparsed = walkTarEntries(archive).map(entry => entryFingerprint(entry));
  if (JSON.stringify(reparsed) !== JSON.stringify(before)) {
    throw new Error("guardian mode repair altered tarball content beyond executable modes");
  }
  return { bytes: gzipSync(archive), repaired };
}
