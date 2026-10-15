import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PREFLIGHT_BUILD_RECEIPT, PREFLIGHT_SELECTION, preflightSteps, type PreflightSelection } from "../../scripts/development/run-preflight.mjs";
import { conservativeIntegrationImpact } from "../../scripts/release/integration-impact.mjs";
import { loadIntegrationOwners } from "../../scripts/release/integration-owners.mjs";
import { resolveValidationJob } from "../../scripts/release/validation-matrix.mjs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const suites = JSON.parse(readFileSync("config/validation-suites.json", "utf8")) as { scopes: Record<string, { commands?: { executable: string; arguments: string[] }[] }> };
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

function selection(overrides: Partial<PreflightSelection> = {}): PreflightSelection {
  return { docsOnly: false, versionOnly: false, openspecTouched: true, documentation: { required: true }, naming: { required: true }, prCore: { tests: ["test/cli/tabs.test.ts"] }, ...overrides };
}

describe("local preflight", () => {
  it("is the package script and runs the fast gates in the declared order", () => {
    expect(packageJson.scripts.preflight).toBe("node scripts/development/run-preflight.mjs");
    expect(preflightSteps(selection()).map(step => step.id)).toEqual([
      "build", "build-receipt", "typecheck", "architecture", "code-documentation-changed", "release-documentation", "naming-changed",
      "docs-governance", "openspec-strict", "delivery-guidance", "changed-tests",
    ]);
  });

  it("first builds and records the receipt as the core job's install step does", () => {
    const [build, receipt] = preflightSteps(selection());
    expect(packageJson.scripts.prepare).toBe(`${build!.executable} ${build!.arguments.join(" ")}`);
    expect(workflow).toContain(`run: ${receipt!.executable} ${receipt!.arguments.join(" ")}`);
    const tests = preflightSteps(selection()).find(entry => entry.id === "changed-tests")!;
    expect(tests.environment).toMatchObject({ VALIDATION_BUILD_READY: "1", VALIDATION_BUILD_RECEIPT: PREFLIGHT_BUILD_RECEIPT });
  });

  it("runs the commands the typecheck and architecture validation scopes declare", () => {
    const steps = preflightSteps(selection());
    for (const id of ["typecheck", "architecture"]) {
      const step = steps.find(entry => entry.id === id)!;
      expect(suites.scopes[id]!.commands).toEqual([{ id, executable: step.executable, arguments: step.arguments }]);
    }
  });

  it("runs each governance script with the arguments its workflow job uses, against the local selection", () => {
    const local = preflightSteps(selection()).filter(step => step.executable !== "npm" && !["build-receipt", "delivery-guidance", "changed-tests"].includes(step.id));
    for (const step of local) {
      const command = [step.executable === "npx" ? "npx" : "node", ...step.arguments].join(" ")
        .replace(PREFLIGHT_SELECTION, ".artifacts/validation/impact.json")
        .replace(/\.artifacts\/validation\/local-([a-z-]+)\.json/u, ".artifacts/validation/$1.json");
      expect(workflow, step.id).toContain(`run: ${command}`);
    }
  });

  it("runs the core job's test scopes with its selected tests", async () => {
    const step = preflightSteps(selection()).find(entry => entry.id === "changed-tests")!;
    const owners = await loadIntegrationOwners();
    const base = "a".repeat(40), head = "b".repeat(40);
    const core = resolveValidationJob({
      impact: { base, head, selectionId: "c".repeat(64), prCore: { tests: ["test/cli/tabs.test.ts"], resourceTests: [] }, integration: conservativeIntegrationImpact({ base, head, owners, reason: "invalidator" }) },
      registry: { owners }, job: "core", platform: "win32", architecture: "x64", node: 24,
    });
    expect(step.arguments.slice(1)).toEqual(core.scopes.filter((scope: string) => !["typecheck", "architecture"].includes(scope)));
    expect(JSON.parse(step.environment!.VALIDATION_TESTS_JSON!)).toEqual(core.tests);
  });

  it("skips code gates for documentation-only changes and never builds the native host", () => {
    const docs = preflightSteps(selection({ docsOnly: true, naming: { required: false }, openspecTouched: false }));
    expect(docs.map(step => step.id)).toEqual(["release-documentation", "docs-governance", "delivery-guidance"]);
    for (const step of preflightSteps(selection())) expect(step.arguments.join(" ")).not.toMatch(/terminal-host|cargo|resident-chaos/u);
  });
});
