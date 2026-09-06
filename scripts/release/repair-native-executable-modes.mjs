import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { guardianBinaryReference } from "../governance/candidate-evidence.mjs";

// Platform: a pack host without posix permissions (Windows) records every packed file
// without executable bits, which would leave the bundled native process guardian
// unspawnable on linux and darwin. The per-platform guardian build manifests packed
// beside the binaries are the authority for which entries must be executable.
const GUARDIAN_MANIFEST_PATH = /^package\/dist\/native\/[^/]+\/manifest\.json$/;
const EXECUTABLE_MODE = 0o755;
const EXECUTABLE_BITS = 0o111;

/** Restore packed native process guardian executability after a host-independent pack. */
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

function walkTarEntries(archive) {
  const entries = [];
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    verifyHeaderChecksum(header, offset);
    const name = readTarString(header.subarray(0, 100));
    const prefix = readTarString(header.subarray(345, 500));
    const path = prefix ? `${prefix}/${name}` : name;
    if (!path.startsWith("package/") || path.includes("../") || path.includes("\\")) throw new Error(`tarball has unsafe entry path: ${path}`);
    const mode = Number.parseInt(readTarString(header.subarray(100, 108)).trim() || "0", 8);
    const size = Number.parseInt(readTarString(header.subarray(124, 136)).trim() || "0", 8);
    if (!Number.isSafeInteger(mode) || mode < 0 || !Number.isSafeInteger(size) || size < 0) throw new Error(`tarball entry header is invalid: ${path}`);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length) throw new Error(`tarball entry is truncated: ${path}`);
    entries.push({ path, mode, size, headerOffset: offset, content: archive.subarray(contentStart, contentEnd) });
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function writeHeaderMode(archive, headerOffset, mode) {
  archive.write(`${mode.toString(8).padStart(7, "0")}\0`, headerOffset + 100, "ascii");
  archive.fill(0x20, headerOffset + 148, headerOffset + 156);
  let sum = 0;
  for (let index = 0; index < 512; index += 1) sum += archive[headerOffset + index];
  archive.write(`${sum.toString(8).padStart(6, "0")}\0 `, headerOffset + 148, "ascii");
}

function verifyHeaderChecksum(header, offset) {
  const recorded = Number.parseInt(readTarString(header.subarray(148, 156)).trim() || "0", 8);
  let sum = 0;
  for (let index = 0; index < 512; index += 1) sum += index >= 148 && index < 156 ? 0x20 : header[index];
  if (sum !== recorded) throw new Error(`tarball header checksum is invalid at offset ${offset}`);
}

function entryFingerprint(entry) {
  return { path: entry.path, size: entry.size, sha256: createHash("sha256").update(entry.content).digest("hex") };
}

function readTarString(buffer) {
  const end = buffer.indexOf(0);
  return buffer.subarray(0, end < 0 ? buffer.length : end).toString("utf8");
}
