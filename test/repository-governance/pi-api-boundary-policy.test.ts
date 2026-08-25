import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPiProductionBoundary } from "../../scripts/governance/pi-api-boundary-policy.mjs";

const repository = resolve(".");
const policy = resolve("scripts/governance/pi-api-boundary-policy.mjs");
const baselinePath = resolve("config/baselines/pi-api-boundary.json");

describe("Pi production boundary freeze", () => {
  it.each([
    [
      "dependency package-file read",
      "src/integrations/pi/engine/fixture.ts",
      "const text = await readFile(join(getPackageDir(), 'CHANGELOG.md'), 'utf8');",
      "production reads a dependency package directory",
    ],
    [
      "private package path construction",
      "src/integrations/pi/components/fixture.ts",
      "const path = join(getPackageDir(), 'dist', 'private.js');",
      "production constructs a private dependency path",
    ],
    [
      "reflected concrete Pi constructor",
      "src/integrations/pi/components/fixture.ts",
      "const editor = Reflect.construct(CustomEditor, [tui, options]);",
      "production reflects concrete Pi constructor 'CustomEditor'",
    ],
    [
      "structural concrete-session substitute",
      "src/integrations/pi/components/fixture.ts",
      "const session = {};\nconst footer = Reflect.construct(FooterComponent, [session, footerData]);",
      "production fabricates concrete Pi session input 'session->FooterComponent'",
    ],
    [
      "ambient Pi oracle",
      "src/foundation/transparent-terminal/fixture.ts",
      "const executable = options.executable ?? 'pi';",
      "explicit vanilla oracle resolves ambient 'pi'",
    ],
  ])("rejects %s with its source path and expected failure", (_kind, path, source, diagnostic) => {
    const errors = inspectPiProductionBoundary({ [path]: source });

    expect(errors.some(error => error.includes(`${path}:`) && error.includes(diagnostic)), errors.join("\n")).toBe(true);
  });

  it("allows only exact findings frozen in the accepted baseline", async () => {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as Record<string, any>;
    const accepted = baseline.packageLayoutReads[2];
    const errors = inspectPiProductionBoundary({ [accepted.path]: accepted.expression }, baseline);
    expect(errors).toContain(`${accepted.path}:1: production reads a dependency package directory; use a documented public API or an owned resource`);
    expect(errors).toContain(`${accepted.path}:1: production constructs a private dependency path; internal dist/src/build layout is not a public API`);
  });

  it.each([
    ["package directory binding", "const packageRoot = getPackageDir();", "dependency package directory"],
    ["node_modules traversal", "const file = 'node_modules/@earendil-works/pi-coding-agent/dist/private.js';", "traverses node_modules"],
    ["split private suffix", "const packageRoot = getPackageDir();\nconst file = join(packageRoot, 'dist', 'modes', 'private.js');", "private dependency path"],
  ])("rejects %s mutation", (_name, source, diagnostic) => {
    expect(inspectPiProductionBoundary({ "src/integrations/pi/engine/mutation.ts": source }).join("\n")).toContain(diagnostic);
  });

  it("allows classified test-only provenance inspection", () => {
    const source = "const file = 'node_modules/@earendil-works/pi-coding-agent/dist/private.js';";
    expect(inspectPiProductionBoundary({ "test/repository-governance/provenance.test.ts": source })).toEqual([]);
    expect(inspectPiProductionBoundary({ "scripts/pi/update-pinned-pi-source-ledger.mjs": source })).toEqual([]);
  });

  it("passes the focused production-boundary command", () => {
    const result = spawnSync(process.execPath, [policy], { cwd: repository, encoding: "utf8" });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/Pi production boundary OK: 0 unapproved findings/);
  });
});
