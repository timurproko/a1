import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { loadIntegrationOwners } from "../../scripts/release/integration-owners.mjs";
import { createTierPlan } from "../../scripts/release/validation-tier.mjs";
import { publicationValidationMatrix } from "../../scripts/release/publication-validation-matrix.mjs";

const execFileAsync = promisify(execFile);

async function discover(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await discover(path));
    else if (entry.name.endsWith(".test.ts")) paths.push(relative(resolve("."), path).split(sep).join("/"));
  }
  return paths.sort();
}
function selectedPaths(args: string[], paths: string[]): string[] {
  const excluded = new Set(args.filter((_argument, index) => args[index - 1] === "--exclude"));
  const explicit = args.filter((argument, index) => argument.endsWith(".test.ts") && args[index - 1] !== "--exclude");
  return paths.filter(path => !excluded.has(path) && (explicit.length === 0 || explicit.includes(path)));
}
async function planPaths(scopes: string[], paths: string[]) {
  const plan = await createTierPlan(scopes);
  return plan.vitest?.invocations.flatMap(invocation => selectedPaths(invocation.arguments, paths)) ?? [];
}
function noDuplicates(label: string, paths: string[]) {
  expect(paths.filter((path, index) => paths.indexOf(path) !== index), label).toEqual([]);
}

describe("integration owner registry", () => {
  it("declares every integration owner, cadence, and deliberate runtime target", async () => {
    const owners = await loadIntegrationOwners();
    expect(owners.map(owner => owner.id)).toEqual([
      "pi-release-resume", "package-contracts", "startup", "image-compatibility", "history-compatibility", "unix-containment",
      "launch-integration", "update-performance", "update-predecessor",
    ]);
    const targets = Object.fromEntries(owners.map(owner => [owner.id, owner.targets.map(target => `${target.platform}-${target.architecture}-node${target.node}`)]));
    expect(targets).toEqual({
      "pi-release-resume": ["win32-x64-node24"],
      "package-contracts": ["win32-x64-node22"],
      startup: ["win32-x64-node22"],
      "image-compatibility": ["win32-x64-node22", "linux-x64-node24", "darwin-arm64-node24"],
      "history-compatibility": ["win32-x64-node22", "linux-x64-node24", "darwin-arm64-node24"],
      "unix-containment": ["linux-x64-node24", "darwin-arm64-node24"],
      "launch-integration": ["win32-x64-node24"],
      "update-performance": ["win32-x64-node24"],
      "update-predecessor": ["win32-x64-node24"],
    });
    expect(owners.filter(owner => owner.cadence === "exhaustive").map(owner => owner.id)).toEqual(["update-performance", "update-predecessor"]);
    expect(owners.filter(owner => owner.cadence === "pull-request").map(owner => owner.id)).toEqual(owners.map(owner => owner.id).filter(id => !["update-performance", "update-predecessor"].includes(id)));
  });

  it("includes exact integration cadence in generated ownership evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-ownership-ledger-"));
    const output = join(directory, "ledger.json");
    try {
      await execFileAsync(process.execPath, ["scripts/release/generate-validation-ownership-ledger.mjs", "--output", output]);
      const ledger = JSON.parse(await readFile(output, "utf8"));
      expect(ledger.integrationOwners.filter((owner: any) => owner.cadence === "exhaustive").map((owner: any) => owner.id)).toEqual(["update-performance", "update-predecessor"]);
      expect(ledger.tests.find((entry: any) => entry.test === "test/foundation/release/update-predecessor.integration.test.ts").integrationTargets)
        .toEqual([expect.objectContaining({ owner: "update-predecessor", cadence: "exhaustive", platform: "win32", node: 24 })]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("assigns each retained integration test to one logical owner while permitting shared graph entries", async () => {
    const owners = await loadIntegrationOwners();
    const tests = owners.flatMap(owner => owner.tests.map(test => ({ owner: owner.id, test })));
    expect(tests.filter((entry, index) => tests.findIndex(candidate => candidate.test === entry.test) !== index)).toEqual([]);
    expect(owners.find(owner => owner.id === "unix-containment")!.entries).toEqual(expect.arrayContaining([
      "test/integrations/pi/session-ui/image-preparation.test.ts",
      "test/features/prompt-history/store.test.ts",
      "test/foundation/release/session-resume.integration.test.ts",
    ]));
  });

  it("has no duplicate selected file on one current PR platform/runtime", async () => {
    const paths = await discover(resolve("test"));
    const win24 = [
      ...await planPaths(["typecheck", "architecture", "fast-remainder", "dist-integration"], paths),
      ...await planPaths(["fast-resource-sensitive"], paths),
      ...await planPaths(["pi-engine-conformance", "package-smoke", "release-update"], paths),
    ];
    const win22 = [
      ...await planPaths(["package-startup"], paths), ...await planPaths(["package-contracts"], paths),
      ...await planPaths(["image-compatibility", "history-compatibility"], paths),
    ];
    const unix = await planPaths(["image-compatibility", "history-compatibility", "unix-containment", "package-smoke"], paths);
    noDuplicates("windows-node24", win24);
    noDuplicates("windows-node22", win22);
    noDuplicates("unix-node24", unix);
  });

  it("keeps full/release plans deduplicated while all four runtime lanes remain declared", async () => {
    const paths = await discover(resolve("test"));
    const full = await planPaths(["full-release"], paths);
    expect(full.sort()).toEqual(paths.sort());
    noDuplicates("full-release", full);
    const lanes = (matrix: { include: { os: string; node: number }[] }) => matrix.include.map(value => `${value.os}:node${value.node}`).sort();
    const allLanes = ["macos-15:node24", "ubuntu-24.04:node24", "windows-2025:node22", "windows-2025:node24"];
    const regression = parse(await readFile(".github/workflows/full-regression.yml", "utf8"));
    expect(lanes(regression.jobs["full-regression"].strategy.matrix)).toEqual(allLanes);
    const release = parse(await readFile(".github/workflows/release.yml", "utf8"));
    expect(release.jobs.validate.strategy.matrix).toBe("${{ fromJson(needs.plan.outputs.validate_matrix) }}");
    for (const mode of ["nightly", "stable"]) expect(lanes(publicationValidationMatrix(mode))).toEqual(allLanes);
  });

  it.each([
    ["missing entry", (value: any) => { value.owners[0].entries[0] = "test/missing.test.ts"; value.owners[0].tests[0] = "test/missing.test.ts"; }, "not a file"],
    ["wrong support kind", (value: any) => { value.owners[0].support = ["support-wrong/"]; }, "wrong kind"],
    ["duplicate scope target", (value: any) => { value.owners[1].scopes = value.owners[0].scopes; value.owners[1].targets = value.owners[0].targets; }, "duplicate integration scope"],
    ["missing cadence", (value: any) => { delete value.owners[0].cadence; }, "owner definition"],
    ["unknown cadence", (value: any) => { value.owners[0].cadence = "sometimes"; }, "owner definition"],
    ["duplicate cadence authority", (value: any) => { value.owners[0].development = true; }, "owner definition"],
    ["test outside entries", (value: any) => { value.owners[0].tests.push("test/new.test.ts"); }, "owner path"],
    ["unknown field", (value: any) => { value.allowUnknown = true; }, "unsupported"],
  ] as const)("rejects invalid registry: %s", async (label, mutate, error) => {
    const source = JSON.parse(await readFile("config/integration-owners.json", "utf8"));
    mutate(source);
    const repository = await mkdtemp(join(tmpdir(), "a1-integration-owners-"));
    try {
      await mkdir(join(repository, "config"), { recursive: true });
      await writeFile(join(repository, "config", "integration-owners.json"), JSON.stringify(source));
      // Invariant: create all originally valid declarations; each fixture mutation must
      // still fail for the named contract instead of incidental missing-fixture files.
      for (const owner of source.owners) for (const path of [...owner.entries, ...owner.tests, ...owner.support]) {
        const target = join(repository, path.endsWith("/") ? path.slice(0, -1) : path);
        if (path === "test/missing.test.ts" || path === "test/new.test.ts") continue;
        if (path.endsWith("/")) await mkdir(target, { recursive: true });
        else { await mkdir(dirname(target), { recursive: true }); await writeFile(target, ""); }
      }
      if (label === "wrong support kind") {
        await rm(join(repository, "support-wrong"), { recursive: true });
        await writeFile(join(repository, "support-wrong"), "not a directory");
      }
      await expect(loadIntegrationOwners(repository)).rejects.toThrow(error);
    } finally { await rm(repository, { recursive: true, force: true }); }
  });
});
