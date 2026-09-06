import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { warmMaterializedRelease, type MaterializedRelease } from "../../../src/foundation/release/index.js";

const repository = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("side-effect-free immutable warmup", () => {
  it("keeps the shipped entry import-only and terminal/session/network free", async () => {
    const source = await readFile(resolve(repository, "bin", "warmup.js"), "utf8");
    expect(source).toContain('import("../dist/composition/owned-ui.js")');
    expect(source).toContain('import("../dist/features/owned-ui/run.js")');
    expect(source).not.toContain('import("../dist/composition/index.js")');
    expect(source).not.toMatch(/composeOwnedUi\s*\(|createAgentSession\s*\(|fetch\s*\(|connect\s*\(|spawn\s*\(|process\.(?:stdin|stdout|stderr)/);
  });

  it("loads the warm UI graph concurrently through narrow owned entries", async () => {
    const source = await readFile(resolve(repository, "bin", "ui.js"), "utf8");
    expect(source).toContain("const modules = Promise.all([");
    for (const entry of [
      "features/launch/runtime-selection.js",
      "foundation/lifecycle/session-selection.js",
      "features/owned-ui/project-trust-prompt.js",
      "features/owned-ui/session-fork-prompt.js",
      "features/owned-ui/run.js",
      "composition/owned-ui.js",
    ]) expect(source).toContain(entry);
    expect(source).not.toContain('import("../dist/features/launch/index.js")');
    expect(source).not.toContain('import("../dist/features/owned-ui/index.js")');
    expect(source).not.toContain('import("../dist/composition/index.js")');
  });

  it("runs the exact release entry with no attached stdio and fails on an unusable graph", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-warmup-"));
    roots.push(root);
    const release = await fakeRelease(root, "process.exit(0)");
    await expect(warmMaterializedRelease(release, {}, 2_000)).resolves.toBeUndefined();

    const failed = await fakeRelease(resolve(root, "failed"), "throw new Error('graph unavailable')");
    await expect(warmMaterializedRelease(failed, {}, 2_000)).rejects.toThrow(/status 1/);
  });
});

async function fakeRelease(root: string, source: string): Promise<MaterializedRelease> {
  await mkdir(resolve(root, "bin"), { recursive: true });
  await writeFile(resolve(root, "bin", "warmup.js"), source);
  const digest = "a".repeat(64);
  return {
    packageName: "@timurproko/a1",
    packageVersion: "1.0.0",
    packageRoot: root,
    releaseRoot: root,
    releaseId: `1.0.0-${digest.slice(0, 20)}`,
    contentDigest: digest,
    files: [],
  };
}
