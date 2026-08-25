import { access, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { readPackedEntries, readPackedManifest } from "../../../scripts/governance/candidate-evidence.mjs";

export async function loadValidationCandidate() {
  const tarball = process.env.VALIDATION_CANDIDATE_TARBALL;
  if (!tarball) throw new Error("VALIDATION_CANDIDATE_TARBALL is required; run this check through the package-smoke or package-install validation scope");
  const path = resolve(tarball);
  await access(path);
  const bytes = await readFile(path);
  return { path, bytes, manifest: readPackedManifest(bytes), entries: readPackedEntries(bytes) };
}

export async function extractValidationCandidate(bytes: Buffer) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-validation-package-"));
  const packageRoot = resolve(root, "package");
  for (const entry of readPackedEntries(bytes)) {
    const relative = entry.path.slice("package/".length);
    if (!relative || entry.type === "5") continue;
    const output = resolve(packageRoot, relative);
    if (!output.startsWith(`${packageRoot}\\`) && !output.startsWith(`${packageRoot}/`)) throw new Error(`unsafe package output path: ${entry.path}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, entry.content);
  }
  await symlink(resolve("node_modules"), resolve(packageRoot, "node_modules"), "junction");
  return { root, packageRoot };
}
