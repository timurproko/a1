import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { classifyIntegrationImpact, conservativeIntegrationImpact, exemptIntegrationImpact } from "../../scripts/release/integration-impact.mjs";
import { loadIntegrationOwners } from "../../scripts/release/integration-owners.mjs";
import { DEVELOPMENT_VALIDATION_MATRIX, selectDevelopmentValidationMatrix, validationJobGroup } from "../../scripts/release/validation-matrix.mjs";

const execFileAsync = promisify(execFile);
const base = "a".repeat(40), head = "b".repeat(40), selectionId = "c".repeat(64);

describe("Development validation job resolution", () => {
  it("keeps a PR-429-shaped conservative promoted job bounded to pull-request owners", async () => {
    const owners = await loadIntegrationOwners();
    const integration = conservativeIntegrationImpact({ base, head, owners, reason: "invalidator" });
    const impact = {
      base,
      head,
      selectionId,
      prCore: { tests: [], resourceTests: [] },
      integration,
    };
    const directory = await mkdtemp(join(tmpdir(), "a1-job-selection-"));
    const path = join(directory, "impact.json");
    try {
      await writeFile(path, JSON.stringify(impact));
      const { stdout } = await execFileAsync(process.execPath, [
        "scripts/release/resolve-validation-job.mjs",
        "--impact", path,
        "--job", "promoted",
        "--platform", "win32",
        "--architecture", "x64",
        "--node", "24",
      ]);
      const result = JSON.parse(stdout);
      expect(result).toMatchObject({
        schema: "a1-validation-job-selection-v3",
        active: true,
        owners: ["launch-integration"],
        deferredOwners: ["update-performance", "update-predecessor"],
      });
      expect(result.scopes).toEqual(["launch-integration"]);
      expect(result.scopes).not.toContain("update-predecessor");
      expect(result.scopes).not.toContain("update-performance");
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(impact);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("schedules every declared matrix entry for a conservative selection", async () => {
    const owners = await loadIntegrationOwners();
    const registry = { owners };
    const impact = { base, head, selectionId, prCore: { tests: [], resourceTests: ["test/resource.test.ts"] }, integration: conservativeIntegrationImpact({ base, head, owners, reason: "invalidator" }) };
    const matrix = selectDevelopmentValidationMatrix({ impact, registry });
    expect(matrix.include).toEqual([...DEVELOPMENT_VALIDATION_MATRIX]);
    expect(matrix.inactive).toEqual([]);
    expect(DEVELOPMENT_VALIDATION_MATRIX).toHaveLength(9);
    for (const owner of owners) for (const target of owner.targets) {
      expect(DEVELOPMENT_VALIDATION_MATRIX.some(entry => entry.group === validationJobGroup(owner.id, target.platform)
        && entry.platform === target.platform && entry.architecture === target.architecture && entry.node === target.node), `${owner.id} ${target.platform}`).toBe(true);
    }
  });

  it("schedules only the PR core for an impact selection without owners or resource-sensitive tests", async () => {
    const owners = await loadIntegrationOwners();
    const registry = { owners };
    const coreSelection = { schema: "a1-pr-core-selection-v1" as const, mode: "impact" as const, exemption: null, policyId: "e".repeat(64), mandatoryTests: [], tests: [], resourceTests: [],
      owners: [], integrationOwners: [], invalidators: [], unknown: [] };
    const integration = classifyIntegrationImpact({ baseId: base, headId: head, changes: [{ status: "M", path: "docs/validation.md" }], owners, coreSelection });
    const impact = { base, head, selectionId, prCore: { tests: [], resourceTests: [] }, integration };
    const matrix = selectDevelopmentValidationMatrix({ impact, registry });
    expect(matrix.include.map(entry => entry.group)).toEqual(["core"]);
    expect(matrix.inactive.map(entry => entry.group)).toEqual(["resource", "pi", "promoted", "package", "startup", "compatibility", "containment", "containment"]);
    const withResource = selectDevelopmentValidationMatrix({ impact: { ...impact, prCore: { tests: [], resourceTests: ["test/resource.test.ts"] } }, registry });
    expect(withResource.include.map(entry => entry.group)).toEqual(["core", "resource"]);
    const exempt = selectDevelopmentValidationMatrix({ impact: { ...impact, integration: exemptIntegrationImpact({ base, head, owners, exemption: "docs-only" }) }, registry });
    expect(exempt.include).toEqual([]);
  });

  it("prints only the include vector for the workflow matrix", async () => {
    const owners = await loadIntegrationOwners();
    const impact = { base, head, selectionId, prCore: { tests: [], resourceTests: ["test/resource.test.ts"] }, integration: conservativeIntegrationImpact({ base, head, owners, reason: "invalidator" }) };
    const directory = await mkdtemp(join(tmpdir(), "a1-matrix-selection-"));
    const path = join(directory, "impact.json"), output = join(directory, "output.txt");
    try {
      await writeFile(path, JSON.stringify(impact));
      await writeFile(output, "");
      const { stdout } = await execFileAsync(process.execPath, ["scripts/release/validation-matrix.mjs", "--impact", path], { env: { ...process.env, GITHUB_OUTPUT: output } });
      expect(JSON.parse(stdout)).toEqual({ include: [...DEVELOPMENT_VALIDATION_MATRIX], inactive: [] });
      const emitted = await readFile(output, "utf8");
      expect(emitted.startsWith("modular_matrix=")).toBe(true);
      expect(Object.keys(JSON.parse(emitted.slice("modular_matrix=".length)))).toEqual(["include"]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
