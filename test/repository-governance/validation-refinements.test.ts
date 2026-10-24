import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { selectIntegrationImpact } from "../../scripts/release/integration-impact.mjs";
import { loadIntegrationOwners } from "../../scripts/release/integration-owners.mjs";
import { selectDevelopmentValidationMatrix } from "../../scripts/release/validation-matrix.mjs";
import { loadValidationOwnership, selectValidationOwnership } from "../../scripts/release/validation-ownership.mjs";

const authority = await loadValidationOwnership();
const integrationOwners = await loadIntegrationOwners();
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

  it("keeps a bounded set of statically reaching consumers when a UI change crosses owner boundaries", () => {
    const result = select(["src/ui/components/scrollbar.ts"]);
    const selected = new Set([...result.tests, ...result.resourceTests]);
    const reachable = authority.consumerGraph.reachingTests("src/ui/components/scrollbar.ts").slice(0, 24);
    for (const test of reachable) {
      const row = authority.ledger.find((entry: any) => entry.test === test);
      if (row?.fastOwner) expect(selected.has(test), test).toBe(true);
    }
    expect(result.tests).toContain("test/ui/components/selection-scrollbar-edge.test.ts");
    expect(result.tests).toContain("test/app/session-shell/session-shell-selection.test.ts");
    expect(result.tests.length + result.resourceTests.length).toBeLessThanOrEqual(40);
  });

  it("retains the coarse owner's critical floor for unavailable graphs, unreviewed files, deleted paths, and mixed inputs", () => {
    for (const options of [
      { authority: { ...authority, consumerGraph: null }, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "M" }] },
      { authority, changes: [{ path: "scripts/governance/unreviewed-new-rule.mjs", status: "A" }] },
      { authority: { ...authority, consumerGraph: { hasPath: () => false } }, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "D" }] },
      { authority, changes: [{ path: "scripts/governance/check-docs-governance.mjs", status: "M" }, { path: "test/repository-governance/validation-tier.test.ts", status: "M" }] },
    ]) expect(selectValidationOwnership(options).tests).toContain("test/repository-governance/validation-suite-policy.test.ts");
    const mixed = select(["scripts/governance/check-docs-governance.mjs", "test/support/release-command-fixture.ts"]);
    expect(mixed.owners.find(owner => owner.owner === "governance")!.reasons.some(reason => reason.code === "shared-support")).toBe(true);
    expect(mixed.tests).toContain("test/repository-governance/validation-suite-policy.test.ts");
  });

  it("accounts for both rename identities and bounds invalidators or manual dispatch to critical floors", () => {
    const renamed = selectValidationOwnership({ authority, changes: [{ status: "R", oldPath: "scripts/governance/check-docs-governance.mjs", path: "src/foundation/release/new.ts" }] });
    expect(renamed.integrationOwners).toContain("package-contracts");
    for (const result of [select(["config/validation-ownership.json"]), select(["scripts/governance/check-docs-governance.mjs"], { manualNoComparison: true })]) {
      expect(result.mode).toBe("conservative");
      expect(result.owners.every(owner => owner.selected)).toBe(true);
      expect(result.tests.length + result.resourceTests.length).toBeLessThanOrEqual(32);
    }
  });

  it("keeps validation-authority changes within the critical file and modular-job budgets", () => {
    for (const owner of authority.policy.owners) expect(owner.criticalTests.length, owner.id).toBeLessThanOrEqual(5);
    const changes = [{ status: "M", path: "config/validation-ownership.json" }];
    const prCore = selectValidationOwnership({ authority, changes });
    const integration = selectIntegrationImpact({ baseId: "a".repeat(40), headId: "b".repeat(40), changes, owners: integrationOwners, coreSelection: prCore });
    const matrix = selectDevelopmentValidationMatrix({ impact: {
      base: "a".repeat(40), head: "b".repeat(40), selectionId: "c".repeat(64), prCore, integration,
    }, registry: { owners: integrationOwners } });
    expect(matrix.include.map(entry => entry.group)).toEqual(["core", "resource", "pi"]);
    expect(matrix.include.length).toBeLessThanOrEqual(3);
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
      owners: [{ id: "example", paths: ["src/"], testPaths: ["test/"], criticalTests: ["test/example.test.ts"], integrationOwners: [] }], refinements: [rule] }));
    await writeFile(join(root, "config/validation-suites.json"), JSON.stringify({ schema: "a1-validation-suites-v1", scopes: {
      "fast-remainder": { kind: "vitest-remainder", exclude: [] }, "fast-resource-sensitive": { kind: "vitest-resource-sensitive", tests: [] },
    } }));
    await writeFile(join(root, "config/integration-owners.json"), JSON.stringify({ schema: "a1-integration-owner-registry-v2", owners: [] }));
    await expect(loadValidationOwnership(root)).rejects.toThrow();
  });
});
