import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readPackedEntries, readPackedManifest } from "../governance/candidate-evidence.mjs";

/** Production uses prefer-offline only: cache misses still resolve normally. */
export function packageInstallArguments(prefix, candidate, cache, offline = false) {
  for (const value of [prefix, candidate, cache]) if (typeof value !== "string" || value.length === 0) throw new TypeError("package cache install paths are required");
  return ["install", "--global", "--prefix", prefix, candidate, "--ignore-scripts", "--no-audit", "--no-fund", "--cache", cache, offline ? "--offline" : "--prefer-offline"];
}

/** Verify every regular candidate payload byte after extraction into a new prefix. */
export async function verifyInstalledCandidate(candidateBytes, packageRoot) {
  const manifest = readPackedManifest(candidateBytes);
  const entries = readPackedEntries(candidateBytes).filter(entry => entry.type === "0" || entry.type === "\0");
  if (entries.length === 0 || entries.length > 4096) throw new Error("candidate payload inventory is invalid or unbounded");
  let bytes = 0;
  const digests = [];
  for (const entry of entries) {
    bytes += entry.content.length;
    if (bytes > 128 * 1024 * 1024) throw new Error("candidate payload exceeds verification bound");
    const relative = entry.path.slice("package/".length);
    if (!relative || relative.startsWith("/") || relative.includes("\\") || relative.split("/").some(part => !part || part === "." || part === "..")) throw new Error("candidate payload path is unsafe");
    const installed = await readFile(resolve(packageRoot, relative));
    if (!installed.equals(entry.content)) throw new Error(`installed candidate payload differs: ${relative}`);
    digests.push({ path: relative, size: installed.length, sha256: createHash("sha256").update(installed).digest("hex") });
  }
  const installedManifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  if (installedManifest.name !== manifest.name || installedManifest.version !== manifest.version
    || JSON.stringify(installedManifest.bin) !== JSON.stringify(manifest.bin)) throw new Error("installed candidate manifest identity differs");
  return { name: manifest.name, version: manifest.version, bin: manifest.bin, files: digests.length, bytes,
    sha256: createHash("sha256").update(JSON.stringify(digests)).digest("hex") };
}

/** Content-free cache size evidence; symlinks and unbounded trees fail closed. */
export async function inspectDownloadCache(root) {
  let files = 0, bytes = 0;
  const pending = [resolve(root)];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => error?.code === "ENOENT" ? [] : Promise.reject(error))) {
      const path = resolve(directory, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error("download cache contains a symbolic link");
      if (metadata.isDirectory()) pending.push(path);
      else if (metadata.isFile()) { files++; bytes += metadata.size; }
      else throw new Error("download cache contains an unsupported entry");
      if (files > 20000 || bytes > 2 * 1024 * 1024 * 1024) throw new Error("download cache inventory exceeds bounds");
    }
  }
  return { files, bytes };
}
