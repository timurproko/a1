/**
 * The one identity every pinned-Pi inventory, ledger, and check compares itself to: the exact
 * package versions come from the dependency authority (package.json plus lockfile) and the
 * upstream commit from the interactive baseline's `upstream.commit`. A Pi upgrade moves both in
 * one place instead of in every test that names the version.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readPiCompatibilityAuthority } from "./pi-compatibility-authority.mjs";

export async function readPinnedPiIdentity(root) {
  const repository = resolve(root);
  const authority = await readPiCompatibilityAuthority(repository);
  const baseline = JSON.parse(await readFile(join(repository, "config", "baselines", "pinned-pi-interactive-baseline.json"), "utf8"));
  const commit = baseline?.upstream?.commit;
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("pinned-pi-interactive-baseline.json upstream.commit must be a full commit sha");
  const coding = authority.packages.find(pkg => pkg.name === "@earendil-works/pi-coding-agent");
  if (!coding) throw new Error("pinned Pi coding-agent package is missing from the dependency authority");
  return Object.freeze({ version: coding.version, commit, packages: authority.packages });
}
