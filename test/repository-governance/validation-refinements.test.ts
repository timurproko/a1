import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadValidationOwnership, selectValidationOwnership } from "../../scripts/release/validation-ownership.mjs";

const authority = await loadValidationOwnership();
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
function select(paths: string[], extra = {}) {
  return selectValidationOwnership({ authority, changes: paths.map(path => ({ path, status: "M" })), ...extra });
}

describe("reviewed ownership refinements", () => {
  it("narrows documentation and environment tooling without scheduling unrelated launch or package work", () => {
    const docs = select(["scripts/governance/check-docs-governance.mjs"]);
    expect(docs.tests).toContain("test/repository-governance/docs-sensitive-governance.test.ts");
    expect(docs.tests).not.toContain("test/repository-governance/openspec-finalization-publication.test.ts");
    expect(docs.tests.length + docs.resourceTests.length).toBeLessThan(20);
    const environment = select(["scripts/development/check-environment.mjs"]);
    expect(environment.tests).toContain("test/repository-governance/environment-prerequisites.test.ts");
    expect(environment.integrationOwners).toEqual([]);
    expect(environment.tests).toEqual(expect.arrayContaining(authority.policy.mandatoryTests));
  });

  it("retains declared clipboard scenarios, cross-owner consumers, and compatibility authority", () => {
    const clipboard = select(["src/app/session-shell/system-clipboard.ts"]);
    expect(clipboard.tests).toEqual(expect.arrayContaining(["test/app/session-shell/system-clipboard.test.ts", "test/composition/prompt-history.test.ts"]));
    expect(clipboard.resourceTests).toContain("test/app/session-shell/session-shell-paste.test.ts");
    expect(clipboard.tests).not.toContain("test/integrations/pi/engine/windows-filesystem-hygiene.test.ts");
    expect(clipboard.integrationOwners).toEqual(["history-compatibility", "image-compatibility", "pi-release-resume"]);
  });

  it("keeps every statically reaching consumer even when that widens a UI change beyond its former coarse owner", () => {
    const result = select(["src/ui/components/scrollbar.ts"]);
    const selected = new Set([...result.tests, ...result.resourceTests]);
    for (const test of authority.consumerGraph.reachingTests("src/ui/components/scrollbar.ts")) {
      const row = authority.ledger.find((entry: any) => entry.test === test);
      if (row?.fastOwner) expect(selected.has(test), test).toBe(true);
    }
    expect(result.tests).toContain("test/ui/components/selection-scrollbar-edge.test.ts");
    expect(result.tests).toContain("test/app/session-shell/session-shell-selection.test.ts");
  });

  it("falls back to the coarse owner for unavailable graphs, unreviewed files, deleted paths, and mixed changed-test/support inputs", () => {
    for (const options of [
      { authority: { ...authority, consumerGraph: null }, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "M" }] },
      { authority, changes: [{ path: "scripts/governance/unreviewed-new-rule.mjs", status: "A" }] },
      { authority: { ...authority, consumerGraph: { hasPath: () => false } }, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "D" }] },
      { authority, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "M" }, { path: "test/repository-governance/validation-tier.test.ts", status: "M" }] },
    ]) expect(selectValidationOwnership(options).tests).toContain("test/repository-governance/openspec-finalization-publication.test.ts");
    const mixed = select(["scripts/governance/check-docs-governance.mjs", "test/support/release-command-fixture.ts"]);
    expect(mixed.owners.find(owner => owner.owner === "governance")!.reasons.some(reason => reason.code === "shared-support")).toBe(true);
    expect(mixed.tests).toContain("test/repository-governance/openspec-finalization-publication.test.ts");
  });

  it("accounts for both rename identities and never narrows invalidators or manual dispatch", () => {
    const renamed = selectValidationOwnership({ authority, changes: [{ status: "R", oldPath: "scripts/governance/check-docs-governance.mjs", path: "src/foundation/release/new.ts" }] });
    expect(renamed.integrationOwners).toContain("package-contracts");
    for (const result of [select(["config/validation-ownership.json"]), select(["scripts/governance/check-docs-governance.mjs"], { manualNoComparison: true })]) {
      expect(result.mode).toBe("conservative");
      expect(result.owners.every(owner => owner.selected)).toBe(true);
    }
  });

  it("adds integration authority for retained transitive integration consumers", () => {
    const test = "test/foundation/release/package-startup.integration.test.ts";
    const result = select(["scripts/governance/check-docs-governance.mjs"], { authority: { ...authority,
      consumerGraph: { hasPath: () => true, reachingTests: () => [test] },
    } });
    expect(result.integrationOwners).toContain("startup");
  });

  it.each(["missing-test", "unknown-integration", "escaping-path", "unknown-owner", "unknown-field"])("blocks malformed refinement authority: %s", async fault => {
    const root = await mkdtemp(join(tmpdir(), "validation-refinement-")); roots.push(root);
    await mkdir(join(root, "config")); await mkdir(join(root, "test"));
    await writeFile(join(root, "test/example.test.ts"), "");
    const rule: any = { id: "example", owner: "example", paths: ["src/example.ts"], testPaths: ["test/example.test.ts"], integrationOwners: [] };
    if (fault === "missing-test") rule.testPaths.push("test/missing.test.ts");
    if (fault === "unknown-integration") rule.integrationOwners.push("unknown");
    if (fault === "escaping-path") rule.paths = ["src/../escape.ts"];
    if (fault === "unknown-owner") rule.owner = "missing";
    if (fault === "unknown-field") rule.ignoreFailures = true;
    await writeFile(join(root, "config/validation-ownership.json"), JSON.stringify({ schema: "a1-validation-ownership-v1", mandatoryTests: [], invalidators: [], unrelated: [], shared: [],
      owners: [{ id: "example", paths: ["src/"], testPaths: ["test/"], integrationOwners: [] }], refinements: [rule] }));
    await writeFile(join(root, "config/validation-suites.json"), JSON.stringify({ schema: "a1-validation-suites-v1", scopes: {
      "fast-remainder": { kind: "vitest-remainder", exclude: [] }, "fast-resource-sensitive": { kind: "vitest-resource-sensitive", tests: [] },
    } }));
    await writeFile(join(root, "config/integration-owners.json"), JSON.stringify({ schema: "a1-integration-owner-registry-v2", owners: [] }));
    await expect(loadValidationOwnership(root)).rejects.toThrow();
  });
});
