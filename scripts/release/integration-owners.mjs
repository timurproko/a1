import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { conservativeIntegrationImpact } from "./integration-impact.mjs";

/** Load and validate the reviewed logical owner registry before classification. */
export async function loadIntegrationOwners(repository = process.cwd()) {
  const value = JSON.parse(await readFile(resolve(repository, "config", "integration-owners.json"), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 2 || value.schema !== "a1-integration-owner-registry-v2" || !Array.isArray(value.owners)) {
    throw new TypeError("unsupported integration owner registry");
  }
  // Invariant: the selection validator owns schema, target, and duplicate-scope checks.
  conservativeIntegrationImpact({ base: "0".repeat(40), head: "1".repeat(40), owners: value.owners, reason: "registry-validation" });
  for (const owner of value.owners) {
    for (const path of [...owner.entries, ...owner.tests]) {
      const metadata = await stat(resolve(repository, path)).catch(() => null);
      if (!metadata?.isFile()) throw new Error(`integration owner path is not a file: ${path}`);
    }
    for (const pattern of owner.support) {
      const metadata = await stat(resolve(repository, pattern.endsWith("/") ? pattern.slice(0, -1) : pattern)).catch(() => null);
      if (!metadata || (pattern.endsWith("/") ? !metadata.isDirectory() : !metadata.isFile())) throw new Error(`integration support path has wrong kind: ${pattern}`);
    }
  }
  return value.owners;
}
