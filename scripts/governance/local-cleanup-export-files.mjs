import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fail } from "./local-cleanup-state.mjs";

const identity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));
export const exportFingerprint = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
const EXPORT_LIMIT = 256 * 1024 * 1024;

/** The same persistent profile-home sibling used by the product, never temporary development data. */
export async function preservedExportDirectory(home = process.env[identity.environment.profileHome] ?? homedir()) {
  if (!isAbsolute(home) || home.includes("\0")) fail("export-preservation-home");
  let path = await realpath(home);
  for (const part of [...dirname(identity.state.piAgentProfile).split(/[\\/]/u), "exports"]) {
    path = join(path, part);
    await mkdir(path, { recursive: true, mode: 0o700 });
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("export-preservation-directory-link");
  }
  return resolve(path);
}

/** Pin real source ancestors; links are never an alternate route to a selected user export. */
export async function exportAncestors(root, file) {
  const ancestors = []; let path = root;
  for (const part of [null, ...file.split("/").slice(0, -1)]) {
    if (part !== null) path = join(path, part);
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("export-preservation-ancestor");
    ancestors.push({ path, identity: exportFingerprint(stat) });
  }
  return ancestors;
}

/** Hash a bounded regular file through its opened identity, then reject replacement or concurrent edits. */
export async function exportSnapshot(path, deadline = Infinity, now = Date.now) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > EXPORT_LIMIT) fail("export-preservation-not-file");
  const file = await open(path, "r");
  try {
    if (exportFingerprint(await file.stat()) !== exportFingerprint(stat)) fail("export-preservation-source-drift");
    const hash = createHash("sha256"), buffer = Buffer.alloc(64 * 1024); let position = 0;
    while (true) {
      if (now() >= deadline) fail("pass-deadline");
      const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      position += bytesRead;
      if (position > EXPORT_LIMIT) fail("export-preservation-size");
      hash.update(buffer.subarray(0, bytesRead));
    }
    const after = await lstat(path), opened = await file.stat();
    if (exportFingerprint(after) !== exportFingerprint(stat) || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs
      || opened.size !== stat.size || opened.mtimeMs !== stat.mtimeMs || position !== stat.size) fail("export-preservation-source-drift");
    return { filesystem: exportFingerprint(stat), size: stat.size, hash: hash.digest("hex") };
  } finally { await file.close(); }
}

/** Exclusive, private, fsynced copying; the source is never removed or opened for writing here. */
export async function copyExport(source, destination, expected, deadline = Infinity, now = Date.now) {
  const input = await open(source, "r"); let output;
  try {
    const before = await input.stat();
    if (exportFingerprint(before) !== expected.filesystem || before.size !== expected.size) fail("export-preservation-source-drift");
    output = await open(destination, "wx", 0o600);
    const hash = createHash("sha256"), buffer = Buffer.alloc(64 * 1024); let position = 0;
    while (true) {
      if (now() >= deadline) fail("pass-deadline");
      const { bytesRead } = await input.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      position += bytesRead;
      if (position > EXPORT_LIMIT) fail("export-preservation-size");
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk); await output.writeFile(chunk);
    }
    if (position !== expected.size || hash.digest("hex") !== expected.hash) fail("export-preservation-source-drift");
    await output.sync();
  } finally { await output?.close(); await input.close(); }
}
