import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { ownedFixtureRoot, fixtureEnvironment } from "../support/owned-fixture-root.js";

const root = fileURLToPath(new URL("../../", import.meta.url)), exec = promisify(execFile);
it("isolates worker TEMP on the owning checkout without mutating the caller environment", async () => {
  const original = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
  const directory = await ownedFixtureRoot("environment-contract-");
  try {
    expect(relative(resolve(root, ".artifacts/test"), directory)).not.toMatch(/^\.\./u);
    expect(fixtureEnvironment(directory)).toMatchObject({ TEMP: directory, TMP: directory, TMPDIR: directory });
    expect({ TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }).toEqual(original);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it("ships the supported standalone worktree modules and exact public declarations", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  expect(manifest.files).toContain("dist");
  for (const name of ["claim-gate-core", "worktree-cleanup-snapshot", "worktree-claim-boundary"]) {
    expect(await readFile(resolve(root, `dist/foundation/lifecycle/${name}.d.mts`), "utf8"))
      .toBe(await readFile(resolve(root, `src/foundation/lifecycle/${name}.d.mts`), "utf8"));
    expect((await readFile(resolve(root, `dist/foundation/lifecycle/${name}.mjs`))).length).toBeGreaterThan(0);
  }
  const snapshot = await import(pathToFileURL(resolve(root, "dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs")).href);
  const execution = await import(pathToFileURL(resolve(root, "dist/foundation/lifecycle/worktree-claim-boundary.mjs")).href);
  expect(typeof snapshot.captureWorktreeCleanupSnapshot).toBe("function");
  expect(typeof execution.executeUnclaimedWorktreeCleanup).toBe("function");
  expect(typeof execution.executeCleanupCommand).toBe("function");
});

it("refuses an unverified regression build receipt instead of packing stale output", async () => {
  const directory = await ownedFixtureRoot("invalid-worktree-build-receipt-");
  try {
    const receipt = resolve(directory, "receipt.json"); await writeFile(receipt, "{}");
    await expect(exec(process.execPath, ["scripts/development/verify-worktree-package.mjs", "--allow-dirty", "--regression-installed-npm", "--verified-build-receipt", receipt], {
      cwd: root, timeout: 25_000, maxBuffer: 2 * 1024 * 1024,
    })).rejects.toMatchObject({ stderr: expect.stringContaining("validation prerequisite receipt is malformed") });
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

it("type-checks an external consumer against built declarations without skipping library validation", async () => {
  const parent = resolve(root, ".artifacts/test"); await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(resolve(parent, "worktree-public-contract-"));
  try {
    const module = (name: string) => relative(directory, resolve(root, `dist/foundation/lifecycle/${name}.mjs`)).replaceAll("\\", "/");
    const file = resolve(directory, "consumer.mts");
    await writeFile(file, `import { captureWorktreeCleanupSnapshot, type WorktreeCleanupSnapshot } from ${JSON.stringify(module("worktree-cleanup-snapshot"))};
import { executeUnclaimedWorktreeCleanup, withUnclaimedWorktree, executeCleanupCommand, type CleanupExecutionOptions } from ${JSON.stringify(module("worktree-claim-boundary"))};
const snapshot: WorktreeCleanupSnapshot = await captureWorktreeCleanupSnapshot("typecheck-only");
const version: 1 = snapshot.version;
const options: CleanupExecutionOptions = { dataDir: "typecheck-only", signal: new AbortController().signal };
const output: Promise<string> = executeUnclaimedWorktreeCleanup(snapshot, "git", ["worktree", "remove", snapshot.path], options);
const guarded: Promise<string> = withUnclaimedWorktree(snapshot, options, () => executeCleanupCommand("git", [], { ...options, protectTarget: true }));
void version; void output; void guarded;
`);
    await exec(process.execPath, [resolve(root, "node_modules/typescript/lib/tsc.js"), "--noEmit", "--strict", "--module", "NodeNext", "--moduleResolution", "NodeNext",
      "--target", "ES2024", "--types", "node", file], { cwd: root, timeout: 25_000, maxBuffer: 2 * 1024 * 1024 });
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
