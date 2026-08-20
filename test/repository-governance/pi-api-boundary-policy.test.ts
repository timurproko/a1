import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPiProductionBoundary } from "../../scripts/pi-api-boundary-policy.mjs";

const repository = resolve(".");
const policy = resolve("scripts/pi-api-boundary-policy.mjs");
const baselinePath = resolve("evidence/pi-api-boundary/baseline.json");

describe("Pi production boundary freeze", () => {
  it.each([
    [
      "dependency package-file read",
      "src/foundation/pi-engine-adapter/fixture.ts",
      "const text = await readFile(join(getPackageDir(), 'CHANGELOG.md'), 'utf8');",
      "production reads a dependency package file",
    ],
    [
      "private package path construction",
      "src/foundation/pi-component-adapter/fixture.ts",
      "const path = join(getPackageDir(), 'dist', 'private.js');",
      "production constructs a private dependency path",
    ],
    [
      "reflected concrete Pi constructor",
      "src/foundation/pi-component-adapter/fixture.ts",
      "const editor = Reflect.construct(CustomEditor, [tui, options]);",
      "production reflects concrete Pi constructor 'CustomEditor'",
    ],
    [
      "structural concrete-session substitute",
      "src/foundation/pi-component-adapter/fixture.ts",
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
    expect(inspectPiProductionBoundary({ [accepted.path]: accepted.expression }, baseline)).toEqual([]);

    const changed = accepted.expression.replace("CHANGELOG.md", "dist/private.md");
    expect(inspectPiProductionBoundary({ [accepted.path]: changed }, baseline)).toEqual([
      `${accepted.path}:1: production reads a dependency package file; use a documented public API or an A1-owned resource`,
    ]);
  });

  it("passes the focused production-boundary command", () => {
    const result = spawnSync(process.execPath, [policy], { cwd: repository, encoding: "utf8" });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/Pi production boundary freeze OK: \d+ exact baseline couplings, 0 unapproved/);
  });
});
