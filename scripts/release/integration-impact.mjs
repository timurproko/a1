import { createIntegrationSelection } from "./integration-selection.mjs";

const MAX_OWNERS = 64;
const MAX_CHANGES = 4096;

/** Select integration owners from bounded coarse ownership and direct test/support declarations. */
export function classifyIntegrationImpact({ baseId, headId, changes, owners, coreSelection }) {
  assertOwners(owners);
  if (!commit(baseId) || !commit(headId) || !Array.isArray(changes) || changes.length > MAX_CHANGES) throw new TypeError("invalid integration impact authority");
  if (!coreSelection || !["impact", "conservative", "exempt"].includes(coreSelection.mode)) throw new TypeError("integration impact requires PR-core ownership selection");
  if (coreSelection.mode === "exempt") return exemptIntegrationImpact({ base: baseId, head: headId, owners, exemption: coreSelection.exemption });
  if (coreSelection.mode === "conservative") return conservativeIntegrationImpact({ base: baseId, head: headId, owners, reason: conservativeReason(coreSelection) });

  const changedPaths = completePaths(changes);
  const linked = new Set(coreSelection.integrationOwners);
  const decisions = owners.map(owner => {
    const directTests = changedPaths.filter(path => owner.tests.includes(path));
    const support = changedPaths.filter(path => owner.support.some(pattern => matches(path, pattern)));
    const reasons = [];
    if (linked.has(owner.id)) reasons.push({ code: "coarse-owner", paths: coarsePaths(coreSelection, owner.id) });
    if (directTests.length > 0) reasons.push({ code: "changed-test", paths: directTests.slice(0, 16) });
    if (support.length > 0) reasons.push({ code: "shared-support", paths: support.slice(0, 16) });
    if (owner.cadence === "exhaustive") {
      const affectedPaths = [...new Set(reasons.flatMap(reason => reason.paths))].slice(0, 16);
      return { owner: owner.id, selected: false, reasons: [{ code: "exhaustive-cadence", paths: affectedPaths }] };
    }
    return { owner: owner.id, selected: reasons.length > 0, reasons: reasons.length > 0 ? reasons : [{ code: "unrelated", paths: [] }] };
  });
  const selection = createIntegrationSelection({ base: baseId, head: headId, ownership: selectionOwnership(owners), mode: "impact", decisions });
  return { selection, fallback: null };
}

/** Fail closed around malformed comparisons while retaining malformed registry as a blocker. */
export function selectIntegrationImpact(options) {
  assertOwners(options.owners);
  if (!commit(options.baseId) || !commit(options.headId)) throw new TypeError("integration selection requires authoritative commits");
  if (options.exemption) return exemptIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, exemption: options.exemption });
  if (options.manualNoComparison || options.coreSelection?.mode === "conservative") {
    return conservativeIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, reason: options.manualNoComparison ? "manual-no-comparison" : conservativeReason(options.coreSelection) });
  }
  try { return classifyIntegrationImpact(options); }
  catch { return conservativeIntegrationImpact({ base: options.baseId, head: options.headId, owners: options.owners, reason: "classifier-failure" }); }
}

export function conservativeIntegrationImpact({ base, head, owners, reason = "classifier-failure" }) {
  assertOwners(owners);
  if (!commit(base) || !commit(head)) throw new TypeError("conservative integration selection requires authoritative commits");
  const decisions = owners.map(owner => owner.cadence === "pull-request"
    ? { owner: owner.id, selected: true, reasons: [{ code: "conservative-fallback", paths: [] }] }
    : { owner: owner.id, selected: false, reasons: [{ code: "exhaustive-cadence", paths: [] }] });
  return { selection: createIntegrationSelection({ base, head, ownership: selectionOwnership(owners), mode: "conservative", decisions }), fallback: reason };
}

export function exemptIntegrationImpact({ base, head, owners, exemption }) {
  assertOwners(owners);
  return { selection: createIntegrationSelection({ base, head, ownership: selectionOwnership(owners), mode: "exempt", exemption }), fallback: null };
}

function coarsePaths(coreSelection, integrationOwner) {
  const selected = coreSelection.owners.filter(owner => owner.selected && owner.integrationOwners?.includes(integrationOwner))
    .flatMap(owner => owner.reasons.flatMap(reason => reason.paths));
  return [...new Set(selected)].slice(0, 16).length > 0 ? [...new Set(selected)].slice(0, 16) : ["config/validation-ownership.json"];
}
function conservativeReason(selection) {
  const code = selection?.owners?.[0]?.reasons?.[0]?.code;
  return code ?? "classifier-failure";
}
function selectionOwnership(owners) {
  return { schema: "a1-integration-ownership-v2", owners: owners.map(({ id, cadence, scopes, targets }) => ({ id, cadence, scopes, targets })) };
}
function assertOwners(owners) {
  if (!Array.isArray(owners) || owners.length === 0 || owners.length > MAX_OWNERS) throw new TypeError("integration owner population missing or unbounded");
  const ids = new Set();
  for (const owner of owners) {
    const keys = ["id", "cadence", "scopes", "targets", "entries", "tests", "support"];
    if (!owner || typeof owner !== "object" || Array.isArray(owner) || Object.keys(owner).length !== keys.length || keys.some(key => !Object.hasOwn(owner, key))
      || !/^[a-z][a-z0-9-]{0,63}$/u.test(owner.id) || ids.has(owner.id)) throw new TypeError("invalid integration owner definition");
    ids.add(owner.id);
    for (const key of ["scopes", "targets", "entries", "tests", "support"]) if (!Array.isArray(owner[key]) || owner[key].length > 512) throw new TypeError("invalid integration owner list");
    if (owner.entries.length === 0 || owner.scopes.length === 0 || owner.targets.length === 0 || !["pull-request", "exhaustive"].includes(owner.cadence)) throw new TypeError("incomplete integration owner definition");
  }
}
function completePaths(changes) {
  return [...new Set(changes.flatMap(change => [change.path, ...(change.oldPath ? [change.oldPath] : [])]))].sort();
}
function matches(path, pattern) { return pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern; }
function commit(value) { return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value); }
