import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanLegacyIdentity } from "../../scripts/governance/product-identity-inventory.mjs";
import { classifyDocumentationAutoMerge } from "../../scripts/governance/documentation-auto-merge.mjs";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("docs-sensitive governance", () => {
  it("runs lightweight inventory consistency for every docs-only pull request", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const docsJob = workflow.slice(workflow.indexOf("\n  docs:"), workflow.indexOf("\n  validate:"));
    expect(docsJob).toContain("if: needs.changes.outputs.docs-only == 'true'");
    expect(docsJob).toContain("check-docs-governance.mjs");
    expect(docsJob).toContain("if: needs.changes.outputs.openspec-touched == 'true'");
    expect(docsJob).not.toMatch(/npm ci|npm run build|vitest/);
  });

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

  it("allows maintained docs while keeping generated baselines on the manual mixed/code path", () => {
    expect(classifyDocumentationAutoMerge([{ filename: "docs/architecture/example.md", status: "modified" }]).eligible).toBe(true);
    expect(classifyDocumentationAutoMerge([{ filename: "config/product-identity-legacy-inventory.json", status: "modified" }]).eligible).toBe(false);
    expect(classifyDocumentationAutoMerge([
      { filename: "docs/architecture/example.md", status: "modified" },
      { filename: "openspec/changes/example/proposal.md", status: "modified" },
      { filename: "config/product-identity-legacy-inventory.json", status: "modified" },
    ]).eligible).toBe(false);
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
