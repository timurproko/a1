import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { selectNamingImpact } from "../../scripts/governance/naming-source-policy.mjs";
import { createIntegrationSelection } from "../../scripts/release/integration-selection.mjs";
import { validationSelectionDigest } from "../../scripts/release/validation-ownership.mjs";

const execFileAsync = promisify(execFile);
const checker = "scripts/governance/check-code-documentation.mjs";
const COMMAND_TEST_TIMEOUT_MS = 15_000;

async function put(root: string, path: string, source: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

async function repositoryFixture(source = "export const value = 1;\n") {
  const root = await mkdtemp(join(tmpdir(), "a1-code-doc-command-"));
  await execFileAsync("git", ["init"], { cwd: root });
  await put(root, "config/baselines/pinned-pi-source-port-ledger.json", '{"records":[]}\n');
  await put(root, "scripts/changed.mjs", source);
  await execFileAsync("git", ["add", "-f", "."], { cwd: root });
  return root;
}

function selection(path: string) {
  const base = "a".repeat(40);
  const head = "b".repeat(40);
  const changes = [{ status: "M", path }];
  const integration = createIntegrationSelection({ base, head, mode: "conservative", ownership: {
    schema: "a1-integration-ownership-v2", owners: [{ id: "fixture", cadence: "pull-request", scopes: ["fixture"], targets: [{ platform: "win32", architecture: "x64", node: 24 }] }],
  } });
  const prCore = {
    schema: "a1-pr-core-selection-v1", mode: "conservative", exemption: null,
    policyId: "c".repeat(64), mandatoryTests: [], tests: [], resourceTests: [], owners: [], integrationOwners: ["fixture"], invalidators: [], unknown: [path],
  };
  const rendering = { tier: "none", reasons: [], fallbacks: [], changedPaths: [path] };
  return {
    schema: "a1-validation-impact-v2",
    base,
    head,
    changes,
    docsOnly: false,
    versionOnly: false,
    openspecTouched: false,
    ordinaryScopes: ["typecheck", "architecture", "pr-core-tests"],
    prCore,
    integration: { selection: integration, dependency: null, fallback: "fixture" },
    rendering,
    naming: selectNamingImpact(changes),
    documentation: { required: true, paths: [path] },
    timing: { classifierMs: 1 },
    selectionId: validationSelectionDigest({ base, head, prCore, integration, rendering }),
  };
}

describe("code documentation command modes", () => {
  it("checks only selected changed files and records zero full scans", async () => {
    const root = await repositoryFixture();
    await put(root, "selection.json", `${JSON.stringify(selection("scripts/changed.mjs"))}\n`);
    await execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "selection.json", "--result", "changed.json"]);
    expect(JSON.parse(await readFile(join(root, "changed.json"), "utf8"))).toMatchObject({
      mode: "changed",
      passed: true,
      filesInspected: 1,
      fullRepositoryScans: 0,
    });
  }, COMMAND_TEST_TIMEOUT_MS);

  it("rejects changed-file violations and invalid selection paths", async () => {
    const root = await repositoryFixture("// unclear\nexport const value = 1;\n");
    await put(root, "selection.json", `${JSON.stringify(selection("scripts/changed.mjs"))}\n`);
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "selection.json"])).rejects.toMatchObject({ code: 1 });
    await put(root, "bad.json", `${JSON.stringify(selection("../outside.ts"))}\n`);
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed", "--selection", "bad.json"])).rejects.toBeDefined();
  }, COMMAND_TEST_TIMEOUT_MS);

  it("performs one explicit complete scan and reports seeded violations", async () => {
    const root = await repositoryFixture("// unclear\nexport const value = 1;\n");
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "full", "--result", "full.json"])).rejects.toMatchObject({ code: 1 });
    expect(JSON.parse(await readFile(join(root, "full.json"), "utf8"))).toMatchObject({
      mode: "full",
      passed: false,
      filesInspected: 1,
      fullRepositoryScans: 1,
    });
  }, COMMAND_TEST_TIMEOUT_MS);

  it("rejects unsupported modes and missing changed selection", async () => {
    const root = await repositoryFixture();
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "unknown"])).rejects.toBeDefined();
    await expect(execFileAsync(process.execPath, [checker, "--root", root, "--mode", "changed"])).rejects.toBeDefined();
  }, COMMAND_TEST_TIMEOUT_MS);
});
