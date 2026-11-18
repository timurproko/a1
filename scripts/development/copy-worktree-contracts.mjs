import { copyFile, lstat, realpath } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const root = await realpath(values.root ?? fileURLToPath(new URL("../../", import.meta.url)));
// Compatibility: TypeScript's inferred JavaScript declarations cannot replace the public snapshot literal/type contracts.
for (const name of ["claim-gate-core", "worktree-cleanup-snapshot", "worktree-claim-boundary"]) {
  const source = join(root, "src/foundation/lifecycle", `${name}.d.mts`), target = join(root, "dist/foundation/lifecycle", `${name}.d.mts`);
  for (const path of [source, target, target.replace(/\.d\.mts$/u, ".mjs")]) {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || resolve(await realpath(path)) !== resolve(path)) throw new Error(`worktree contract build boundary is not a regular file: ${name}`);
  }
  await copyFile(source, target);
}
await copyFile(join(root, "src/foundation/lifecycle/claim-gate-witness.ps1"), join(root, "dist/foundation/lifecycle/claim-gate-witness.ps1"));
console.log("Public worktree execution declarations copied");
