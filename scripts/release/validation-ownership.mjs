import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const TEST = /\.test\.[cm]?[jt]sx?$/u;
const OPERATIONAL = /\.(?:[cm]?[jt]s|[jt]sx|json|ya?ml|toml|rs)$/u;
const MAX_TESTS = 2048;

/** Load and validate the bounded path/test ownership policy. */
export async function loadValidationOwnership(repository = process.cwd()) {
  const root = resolve(repository);
  const [policy, suites, tests] = await Promise.all([
    readFile(resolve(root, "config/validation-ownership.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/validation-suites.json"), "utf8").then(JSON.parse),
    discoverTests(resolve(root, "test"), root),
  ]);
  assertPolicy(policy);
  if (suites?.schema !== "a1-validation-suites-v1") throw new TypeError("validation ownership requires the supported suite registry");
  if (tests.length === 0 || tests.length > MAX_TESTS) throw new TypeError("retained test population is missing or unbounded");

  const testOwners = tests.map(test => {
    const owners = policy.owners.filter(owner => owner.testPaths.some(pattern => matches(test, pattern))).map(owner => owner.id);
    if (owners.length !== 1) throw new TypeError(`retained test requires exactly one coarse owner: ${test}`);
    return { test, owner: owners[0] };
  });
  for (const test of policy.mandatoryTests) {
    if (!tests.includes(test)) throw new TypeError(`mandatory PR-core test does not exist: ${test}`);
  }

  const fast = suites.scopes?.["fast-remainder"];
  const resource = suites.scopes?.["fast-resource-sensitive"];
  if (fast?.kind !== "vitest-remainder" || resource?.kind !== "vitest-resource-sensitive") {
    throw new TypeError("validation ownership requires complete fast partitions");
  }
  const excluded = new Set(fast.exclude ?? []);
  const resourceTests = new Set(resource.tests ?? []);
  const suiteOwners = new Map();
  for (const [scope, definition] of Object.entries(suites.scopes ?? {})) {
    for (const test of definition.tests ?? []) {
      const values = suiteOwners.get(test) ?? [];
      values.push(scope);
      suiteOwners.set(test, values);
    }
  }
  const ledger = testOwners.map(entry => ({
    ...entry,
    prCore: policy.mandatoryTests.includes(entry.test),
    fastOwner: resourceTests.has(entry.test) ? "fast-resource-sensitive" : excluded.has(entry.test) ? null : "fast-remainder",
    completeOwners: suiteOwners.get(entry.test) ?? [],
  }));
  return { policy, suites, tests, ledger, policyId: digest(policy) };
}

/** Select mandatory core tests, coarse unit owners, and linked integration owners. */
export function selectValidationOwnership({ authority, changes, manualNoComparison = false, exemption = null }) {
  const { policy, ledger, policyId } = authority;
  const paths = completePaths(changes);
  const invalidators = paths.filter(path => policy.invalidators.some(pattern => matches(path, pattern)));
  const ownerReasons = new Map(policy.owners.map(owner => [owner.id, []]));
  for (const path of paths) {
    for (const owner of policy.owners) {
      if (owner.paths.some(pattern => matches(path, pattern))) ownerReasons.get(owner.id).push({ code: "owned-path", path });
      if (owner.testPaths.some(pattern => matches(path, pattern))) ownerReasons.get(owner.id).push({ code: "changed-test", path });
    }
    for (const shared of policy.shared) if (shared.paths.some(pattern => matches(path, pattern))) {
      for (const owner of shared.owners) ownerReasons.get(owner).push({ code: "shared-support", path });
    }
  }
  const unknown = paths.filter(path => isOperational(path)
    && !policy.invalidators.some(pattern => matches(path, pattern))
    && !policy.unrelated.some(pattern => matches(path, pattern))
    && !policy.owners.some(owner => [...owner.paths, ...owner.testPaths].some(pattern => matches(path, pattern)))
    && !policy.shared.some(shared => shared.paths.some(pattern => matches(path, pattern))));
  const mode = exemption ? "exempt" : manualNoComparison || invalidators.length > 0 || unknown.length > 0 || paths.length === 0 ? "conservative" : "impact";
  const decisions = policy.owners.map(owner => {
    const selected = mode === "conservative" || mode === "impact" && ownerReasons.get(owner.id).length > 0;
    const reasons = mode === "exempt" ? [{ code: exemption, paths: [] }]
      : mode === "conservative" ? [{ code: manualNoComparison ? "manual-no-comparison" : invalidators.length > 0 ? "invalidator" : unknown.length > 0 ? "unknown-path" : "empty-comparison", paths: (invalidators.length > 0 ? invalidators : unknown).slice(0, 16) }]
      : selected ? collapseReasons(ownerReasons.get(owner.id)) : [{ code: "unrelated", paths: [] }];
    return { owner: owner.id, selected, reasons, integrationOwners: [...owner.integrationOwners] };
  });
  const selectedOwners = new Set(decisions.filter(decision => decision.selected).map(decision => decision.owner));
  const selectedLedger = mode === "exempt" ? [] : ledger.filter(entry => entry.prCore || selectedOwners.has(entry.owner));
  const tests = selectedLedger.filter(entry => entry.fastOwner === "fast-remainder").map(entry => entry.test);
  const resourceTests = selectedLedger.filter(entry => entry.fastOwner === "fast-resource-sensitive").map(entry => entry.test);
  const integrationOwners = [...new Set(policy.owners.filter(owner => selectedOwners.has(owner.id)).flatMap(owner => owner.integrationOwners))].sort();
  return {
    schema: "a1-pr-core-selection-v1",
    mode,
    exemption,
    policyId,
    mandatoryTests: mode === "exempt" ? [] : [...policy.mandatoryTests],
    tests: [...new Set(tests)].sort(),
    resourceTests: [...new Set(resourceTests)].sort(),
    owners: decisions,
    integrationOwners,
    invalidators,
    unknown,
  };
}

export function assertValidationOwnershipSelection(value, authority) {
  if (!value || value.schema !== "a1-pr-core-selection-v1" || !["impact", "conservative", "exempt"].includes(value.mode)
    || value.policyId !== authority.policyId || !Array.isArray(value.owners) || value.owners.length !== authority.policy.owners.length) {
    throw new TypeError("invalid PR-core ownership selection");
  }
  for (const key of ["mandatoryTests", "tests", "resourceTests", "integrationOwners", "invalidators", "unknown"]) {
    if (!Array.isArray(value[key]) || value[key].length > MAX_TESTS || new Set(value[key]).size !== value[key].length) throw new TypeError(`invalid PR-core ${key}`);
  }
  if (value.mode === "exempt" && (value.tests.length > 0 || value.resourceTests.length > 0 || value.integrationOwners.length > 0)) {
    throw new TypeError("exempt PR-core selection contains work");
  }
  return value;
}

async function discoverTests(directory, root) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...await discoverTests(path, root));
    else if (entry.isFile() && TEST.test(entry.name)) found.push(relative(root, path).split(sep).join("/"));
  }
  return found.sort();
}

function assertPolicy(policy) {
  if (!policy || policy.schema !== "a1-validation-ownership-v1" || !Array.isArray(policy.mandatoryTests)
    || !Array.isArray(policy.invalidators) || !Array.isArray(policy.unrelated) || !Array.isArray(policy.shared)
    || !Array.isArray(policy.owners) || policy.owners.length === 0 || policy.owners.length > 32) throw new TypeError("unsupported validation ownership policy");
  const ids = new Set(policy.owners.map(owner => owner.id));
  if (ids.size !== policy.owners.length) throw new TypeError("duplicate validation owner");
  for (const owner of policy.owners) {
    if (!/^[a-z][a-z0-9-]{0,63}$/u.test(owner.id) || !Array.isArray(owner.paths) || !Array.isArray(owner.testPaths)
      || owner.testPaths.length === 0 || !Array.isArray(owner.integrationOwners)) throw new TypeError("invalid validation owner");
  }
  for (const shared of policy.shared) if (!Array.isArray(shared.paths) || !Array.isArray(shared.owners)
    || shared.owners.some(owner => !ids.has(owner))) throw new TypeError("invalid shared validation ownership");
}

function completePaths(changes) {
  if (!Array.isArray(changes) || changes.length > 4096) throw new TypeError("invalid validation changes");
  return [...new Set(changes.flatMap(change => [change.path, ...(change.oldPath ? [change.oldPath] : [])]))].sort();
}
function isOperational(path) {
  return OPERATIONAL.test(path) || ["src/", "scripts/", "test/", "bin/", "native/", "config/", ".github/"].some(prefix => path.startsWith(prefix))
    || path === ".npmrc";
}
function matches(path, pattern) {
  if (pattern.endsWith("*")) return path.startsWith(pattern.slice(0, -1));
  return pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern;
}
function collapseReasons(reasons) {
  const grouped = new Map();
  for (const reason of reasons) {
    const values = grouped.get(reason.code) ?? [];
    if (!values.includes(reason.path) && values.length < 16) values.push(reason.path);
    grouped.set(reason.code, values);
  }
  return [...grouped].map(([code, paths]) => ({ code, paths }));
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function validationSelectionDigest(value) { return digest(value); }
function digest(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
