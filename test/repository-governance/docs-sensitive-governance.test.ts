import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanLegacyIdentity } from "../../scripts/governance/product-identity-inventory.mjs";

// Invariant: every fixture root is removed after its test, whatever its outcome.
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("docs-sensitive governance", () => {
  it("detects an OpenSpec archive that changes an inventoried occurrence", async () => {
    const root = await fixture({
      "package.json": "{}",
      "openspec/changes/current/evidence.md": "Historical AddOne record.",
    });
    const before = await scanLegacyIdentity(root);
    expect(before.summary.total).toBe(1);
    await mkdir(resolve(root, "openspec/changes/archive/current"), { recursive: true });
    await rename(resolve(root, "openspec/changes/current/evidence.md"), resolve(root, "openspec/changes/archive/current/evidence.md"));
    const after = await scanLegacyIdentity(root);
    expect(after.summary.total).toBe(0);
    expect(after).not.toEqual(before);
  });
});

async function fixture(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-docs-governance-"));
  roots.push(root);
  for (const [path, source] of Object.entries(files)) {
    const absolute = resolve(root, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, source);
  }
  return root;
}
