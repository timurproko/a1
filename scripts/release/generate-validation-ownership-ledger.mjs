import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const output = resolve(valueAfter("--output") ?? "openspec/changes/shorten-development-validation/evidence/ownership-ledger.json");
const baseline = JSON.parse(await readFile(resolve(root, "openspec/changes/shorten-development-validation/evidence/ownership-baseline.json"), "utf8"));
const suites = JSON.parse(await readFile(resolve(root, "config/validation-suites.json"), "utf8"));
const registry = JSON.parse(await readFile(resolve(root, "config/integration-owners.json"), "utf8"));
const paths = await discover(resolve(root, "test"));
const sensitive = new Set(suites.scopes["fast-resource-sensitive"].tests);
const excluded = new Set(suites.scopes["fast-remainder"].exclude);
const scopeTargets = new Map([
  ["fast-remainder", [{ platform: "win32", architecture: "x64", node: 24 }]],
  ["fast-resource-sensitive", [{ platform: "win32", architecture: "x64", node: 24 }]],
  ["dist-integration", [{ platform: "win32", architecture: "x64", node: 24 }]],
  ["rendering-smoke", [{ platform: "win32", architecture: "x64", node: 24 }]],
  ["rendering-stability", [{ platform: "win32", architecture: "x64", node: 24 }]],
]);
for (const owner of registry.owners) for (const scope of owner.scopes) {
  const values = scopeTargets.get(scope) ?? [];
  for (const target of owner.targets) if (!values.some(value => JSON.stringify(value) === JSON.stringify(target))) values.push(target);
  scopeTargets.set(scope, values);
}
const after = paths.map(path => {
  const executions = [];
  if (sensitive.has(path)) add("fast-resource-sensitive");
  else if (!excluded.has(path)) add("fast-remainder");
  for (const [scope, definition] of Object.entries(suites.scopes)) if ((definition.tests ?? []).includes(path) && !["fast-resource-sensitive"].includes(scope)) add(scope);
  const keys = executions.map(value => `${value.scope}:${value.platform}:${value.architecture}:${value.node}`);
  if (new Set(keys).size !== keys.length) throw new Error(`duplicate PR owner target: ${path}`);
  const releaseScopes = [...new Set(executions.filter(value => ["package-smoke", "package-contracts", "package-startup"].includes(value.scope)).map(value => value.scope))];
  return { path, pr: executions.sort(compare), fullAndNightly: ["windows-2025/node22", "windows-2025/node24", "ubuntu-24.04/node24", "macos-15/node24"],
    developmentRelease: releaseScopes.flatMap(scope => ["windows-2025/node22", "windows-2025/node24", "ubuntu-24.04/node24", "macos-15/node24"].map(target => `${target}:${scope}`)) };
  function add(scope) { for (const target of scopeTargets.get(scope) ?? []) executions.push({ scope, ...target }); }
});
const report = {
  schema: "a1-validation-ownership-ledger-v1", baseline: baseline.source, implementationState: "generated working tree; regenerate on final head",
  inputs: await Promise.all(["config/validation-suites.json", "config/integration-owners.json", ".github/workflows/ci.yml", ".github/workflows/full-regression.yml", ".github/workflows/release.yml"].map(async path => ({ path, sha256: createHash("sha256").update(await readFile(resolve(root, path))).digest("hex") }))),
  counts: { beforeTests: baseline.tests.length, afterTests: after.length, retainedBaselineTests: baseline.tests.filter(value => paths.includes(value.path)).length,
    newTests: after.filter(value => !baseline.tests.some(before => before.path === value.path)).map(value => value.path) },
  platformRuntimeDeclarations: { development: ["win32/x64/node24", "win32/x64/node22", "linux/x64/node24", "darwin/arm64/node24"], fullAndNightly: ["windows-2025/node22", "windows-2025/node24", "ubuntu-24.04/node24", "macos-15/node24"], releaseDevelop: ["windows-2025/node22", "windows-2025/node24", "ubuntu-24.04/node24", "macos-15/node24"] },
  packageScenarios: JSON.parse(await readFile(resolve(root, "openspec/changes/shorten-development-validation/evidence/package-owner-migration.json"), "utf8")).scenarios,
  releaseContracts: { before: baseline.releaseContracts, after: suites.releaseContracts }, tests: after,
};
if (report.counts.retainedBaselineTests !== report.counts.beforeTests) throw new Error("baseline test disappeared from ownership ledger");
await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Ownership ledger: ${after.length} tests; ${report.counts.newTests.length} added since baseline\n`);
async function discover(directory) { const values = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = resolve(directory, entry.name); if (entry.isDirectory()) values.push(...await discover(path)); else if (entry.name.endsWith(".test.ts")) values.push(relative(root, path).split(sep).join("/")); } return values.sort(); }
function compare(left, right) { return JSON.stringify(left).localeCompare(JSON.stringify(right)); }
function valueAfter(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
