import { compareIntegrationDependencies } from "./integration-dependency-graph.mjs";
import { createIntegrationSelection } from "./integration-selection.mjs";
import { isDependencyPath } from "./revision-dependencies.mjs";

const SCRIPT = /\.(?:[cm]?[jt]s|[jt]sx)$/u;
const MAX_OWNERS = 64;
const MAX_CHANGES = 4096;

/**
 * Convert dependency evidence and explicit test/support ownership into the
 * strict selection contract. This remains inert until a workflow and aggregate
 * consume the same selection identity.
 */
export function classifyIntegrationImpact({ base, head, changes, owners, basePolicy, headPolicy = basePolicy }) {
  assertOwners(owners);
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) throw new TypeError("invalid integration change population");
  const dependency = compareIntegrationDependencies({ base, head, changes, owners, basePolicy, headPolicy });
  const changedPaths = completePaths(changes);
  const ownedTests = new Map();
  for (const owner of owners) for (const test of owner.tests) {
    const values = ownedTests.get(test) ?? [];
    values.push(owner.id);
    ownedTests.set(test, values);
  }
  if ([...ownedTests.values()].some(values => values.length !== 1)) throw new TypeError("integration tests require exactly one owner");
  const unknownTest = changedPaths.find(path => isRetainedTest(path) && !ownedTests.has(path));
  const unknownSupport = changedPaths.find(path => path.startsWith("test/support/")
    && !owners.some(owner => owner.support.some(pattern => matches(path, pattern)))
    && !dependency.owners.some(owner => owner.matches.some(match => match.path === path)));
  const unknownOperational = changedPaths.find(path => isOperational(path)
    && ![...basePolicy.unrelated, ...headPolicy.unrelated].some(pattern => matches(path, pattern))
    && !dependency.owners.some(owner => owner.matches.some(match => match.path === path))
    && !dependency.owners.some(owner => owner.invalidators.includes(path))
    && !ownedTests.has(path)
    && !owners.some(owner => owner.support.some(pattern => matches(path, pattern))));
  const globalFallback = unknownTest ?? unknownSupport ?? unknownOperational;
  const decisions = owners.map(owner => {
    const graph = dependency.owners.find(candidate => candidate.owner === owner.id);
    const reasons = [];
    const changedTest = changedPaths.filter(path => owner.tests.includes(path));
    const sharedSupport = changedPaths.filter(path => owner.support.some(pattern => matches(path, pattern)));
    if (changedTest.length > 0) reasons.push({ code: "changed-test", paths: changedTest.slice(0, 16) });
    if (sharedSupport.length > 0) reasons.push({ code: "shared-support", paths: sharedSupport.slice(0, 16) });
    if (graph.invalidators.length > 0) reasons.push({ code: "invalidator", paths: graph.invalidators.slice(0, 16) });
    for (const match of graph.matches.slice(0, 16 - reasons.length)) reasons.push({ code: "reachable", paths: match.chain.slice(-16) });
    if (globalFallback || graph.issues.length > 0 || graph.matchesTruncated) reasons.push({ code: "conservative-fallback", paths: [] });
    const selected = reasons.length > 0;
    return { owner: owner.id, selected, reasons: selected ? reasons.slice(0, 64) : [{ code: owner.development ? "unrelated" : "not-development", paths: [] }] };
  });
  const selection = createIntegrationSelection({ base: base.revision, head: head.revision, ownership: selectionOwnership(owners), mode: "impact", decisions });
  return { selection, dependency, fallback: globalFallback ? "unclassified-operational-input" : null };
}

/** Fail closed around the classifier without concealing malformed ownership authority. */
export function selectIntegrationImpact(options) {
  assertOwners(options.owners);
  if (!/^[0-9a-f]{40}$/u.test(options.baseId) || !/^[0-9a-f]{40}$/u.test(options.headId)) throw new TypeError("integration selection requires authoritative commits");
  if (options.exemption) return exemptIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, exemption: options.exemption });
  if (options.manualNoComparison) return conservativeIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, reason: "manual-no-comparison" });
  try {
    return classifyIntegrationImpact(options);
  } catch {
    return conservativeIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, reason: "classifier-failure" });
  }
}

/** Missing history, parser faults, or manual no-comparison paths select all development owners. */
export function conservativeIntegrationImpact({ base, head, owners, reason = "classifier-failure" }) {
  assertOwners(owners);
  if (!/^[0-9a-f]{40}$/u.test(base) || !/^[0-9a-f]{40}$/u.test(head)) throw new TypeError("conservative integration selection requires authoritative commits");
  const selection = createIntegrationSelection({ base, head, ownership: selectionOwnership(owners), mode: "conservative" });
  return { selection, dependency: null, fallback: reason };
}

export function exemptIntegrationImpact({ base, head, owners, exemption }) {
  assertOwners(owners);
  return { selection: createIntegrationSelection({ base, head, ownership: selectionOwnership(owners), mode: "exempt", exemption }), dependency: null, fallback: null };
}

function selectionOwnership(owners) {
  return { schema: "a1-integration-ownership-v1", owners: owners.map(({ id, scopes, targets, development }) => ({ id, scopes, targets, development })) };
}

function assertOwners(owners) {
  if (!Array.isArray(owners) || owners.length === 0 || owners.length > MAX_OWNERS) throw new TypeError("integration owner population missing or unbounded");
  const ids = new Set();
  for (const owner of owners) {
    const keys = ["id", "scopes", "targets", "development", "entries", "tests", "support"];
    if (!owner || typeof owner !== "object" || Array.isArray(owner) || Object.keys(owner).length !== keys.length || keys.some(key => !Object.hasOwn(owner, key))
      || !/^[a-z][a-z0-9-]{0,63}$/u.test(owner.id) || ids.has(owner.id)) throw new TypeError("invalid integration owner definition");
    ids.add(owner.id);
    for (const key of ["scopes", "targets", "entries", "tests", "support"]) if (!Array.isArray(owner[key]) || owner[key].length > 512) throw new TypeError("invalid integration owner list");
    if (owner.entries.length === 0 || owner.scopes.length === 0 || owner.targets.length === 0 || typeof owner.development !== "boolean") throw new TypeError("incomplete integration owner definition");
    if ([...owner.entries, ...owner.tests].some(path => !isDependencyPath(path)) || owner.tests.some(path => !owner.entries.includes(path) || !isRetainedTest(path))
      || owner.support.some(pattern => !patternPath(pattern))) throw new TypeError("invalid integration owner path");
  }
}

function completePaths(changes) {
  const paths = [];
  for (const change of changes) {
    if (!change || !/^[ACDMRTUXB]$/u.test(change.status) || !isDependencyPath(change.path)
      || (change.oldPath !== undefined && !isDependencyPath(change.oldPath))) throw new TypeError("invalid integration change");
    paths.push(change.path);
    if (change.oldPath !== undefined) paths.push(change.oldPath);
  }
  return [...new Set(paths)].sort();
}
function isRetainedTest(path) { return path.startsWith("test/") && /\.test\.[cm]?[jt]sx?$/u.test(path); }
function isOperational(path) {
  return SCRIPT.test(path) || path.startsWith("bin/") || path.startsWith("native/") || path.startsWith("config/") || path.startsWith(".github/workflows/")
    || ["package.json", "package-lock.json", "tsconfig.json", "tsconfig.build.json", "vitest.config.ts", ".npmrc"].includes(path);
}
function patternPath(value) { return typeof value === "string" && isDependencyPath(value.endsWith("/") ? value.slice(0, -1) : value); }
function matches(path, pattern) { return pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern; }
