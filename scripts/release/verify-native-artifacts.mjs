import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const RELEASE_NATIVE_TARGETS = Object.freeze([
  Object.freeze({ platform: "win32", architecture: "x64" }),
  Object.freeze({ platform: "linux", architecture: "x64" }),
  Object.freeze({ platform: "darwin", architecture: "arm64" }),
  Object.freeze({ platform: "darwin", architecture: "x64" }),
]);

const MANIFESTS = Object.freeze([
  Object.freeze({ filename: "manifest.json", schema: "a1-process-guardian-artifact-v1", files: ["artifact"] }),
  Object.freeze({ filename: "terminal-host.manifest.json", schema: "a1-terminal-host-artifact-v1", files: ["artifact", "sessionLock", "notices"] }),
]);

/**
 * Lists every reason the assembled `dist/native` tree is not a complete release: each supported
 * platform needs its process guardian and terminal host, and every recorded file must exist with
 * the recorded size and SHA-256.
 */
export async function nativeArtifactProblems(nativeRoot, targets = RELEASE_NATIVE_TARGETS) {
  const problems = [];
  for (const { platform, architecture } of targets) {
    const directory = resolve(nativeRoot, `${platform}-${architecture}`);
    for (const expected of MANIFESTS) {
      const label = `${platform}-${architecture}/${expected.filename}`;
      let manifest;
      try {
        manifest = JSON.parse(await readFile(resolve(directory, expected.filename), "utf8"));
      } catch {
        problems.push(`${label} is missing or malformed`);
        continue;
      }
      if (manifest.schema !== expected.schema) problems.push(`${label} has schema ${manifest.schema}, expected ${expected.schema}`);
      if (manifest.platform !== platform || manifest.architecture !== architecture) problems.push(`${label} records ${manifest.platform}-${manifest.architecture}`);
      if (manifest.capability !== "supported") problems.push(`${label} is not marked supported`);
      for (const field of expected.files) {
        const record = manifest[field];
        if (typeof record?.filename !== "string" || basename(record.filename) !== record.filename) {
          problems.push(`${label} has no valid ${field} file record`);
          continue;
        }
        const path = resolve(directory, record.filename);
        const bytes = await readFile(path).catch(() => undefined);
        if (bytes === undefined) {
          problems.push(`${platform}-${architecture}/${record.filename} is missing`);
          continue;
        }
        const size = (await stat(path)).size;
        if (size !== record.size || createHash("sha256").update(bytes).digest("hex") !== record.sha256) {
          problems.push(`${platform}-${architecture}/${record.filename} does not match ${expected.filename}`);
        }
      }
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // Rationale: a validation lane builds only its own platform, so `--local` checks just that one.
  const targets = process.argv.includes("--local")
    ? RELEASE_NATIVE_TARGETS.filter(target => target.platform === process.platform && target.architecture === process.arch)
    : RELEASE_NATIVE_TARGETS;
  if (targets.length === 0) {
    console.error(`${process.platform}-${process.arch} is not a release platform`);
    process.exit(1);
  }
  const problems = await nativeArtifactProblems(resolve("dist/native"), targets);
  if (problems.length > 0) {
    console.error(`Native release artifacts are incomplete (${problems.length}):\n${problems.map(problem => `- ${problem}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Native release artifacts OK for ${targets.map(target => `${target.platform}-${target.architecture}`).join(", ")}`);
}
