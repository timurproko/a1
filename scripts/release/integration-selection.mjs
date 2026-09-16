import { createHash } from "node:crypto";

const MAX_OWNERS = 64;
const MAX_SCOPES = 64;
const MAX_REASONS = 64;
const SELECT_REASONS = new Set(["coarse-owner", "changed-test", "shared-support", "invalidator", "conservative-fallback"]);
const EXCLUDE_REASONS = new Set(["unrelated", "exhaustive-cadence", "docs-only", "version-only"]);

/**
 * Build a complete integration decision document. Digests bind content, not trust:
 * every workflow resolver and aggregate supplies separate checkout-derived authority.
 */
export function createIntegrationSelection({ base, head, ownership, mode = "conservative", exemption = null, decisions }) {
  assertOwnership(ownership);
  if (decisions === undefined) {
    if (mode === "impact") throw new TypeError("impact mode requires explicit decisions for every owner");
    decisions = ownership.owners.map(owner => ({
      owner: owner.id,
      selected: mode === "conservative" && owner.cadence === "pull-request",
      reasons: [{ code: mode === "exempt" ? exemption : owner.cadence === "pull-request" ? "conservative-fallback" : "exhaustive-cadence", paths: [] }],
    }));
  }
  if (!Array.isArray(decisions) || decisions.length !== ownership.owners.length) throw new TypeError("incomplete integration decisions");
  const byId = new Map();
  for (const decision of decisions) {
    exactKeys(decision, ["owner", "selected", "reasons"], "decision");
    if (byId.has(decision.owner) || !ownership.owners.some(owner => owner.id === decision.owner)) throw new TypeError("unknown or duplicate integration decision");
    byId.set(decision.owner, decision);
  }
  const value = {
    schema: "a1-integration-selection-v2", base, head, mode, exemption,
    ownershipId: digest(normalizedOwnership(ownership)),
    owners: normalizedOwnership(ownership).owners.map(owner => ({
      owner: owner.id, cadence: owner.cadence, scopes: owner.scopes, targets: owner.targets,
      selected: byId.get(owner.id).selected, reasons: byId.get(owner.id).reasons,
    })),
  };
  const authority = { base, head, ownership, exemption };
  assertPayload({ ...value, selectionId: "" }, authority);
  value.selectionId = digest(value);
  return assertIntegrationSelection(value, authority);
}

/** Reject partial, stale, or malformed evidence before a consumer considers any skip. */
export function assertIntegrationSelection(value, authority) {
  assertPayload(value, authority);
  const { selectionId, ...payload } = value;
  if (typeof selectionId !== "string" || !/^[0-9a-f]{64}$/u.test(selectionId) || selectionId !== digest(payload)) throw new TypeError("integration selection identity mismatch");
  return value;
}

function assertPayload(value, authority) {
  exactKeys(value, ["schema", "base", "head", "mode", "exemption", "ownershipId", "owners", "selectionId"], "selection");
  if (value.schema !== "a1-integration-selection-v2") throw new TypeError("unsupported integration selection schema");
  if (!authority || !commit(authority.base) || !commit(authority.head)) throw new TypeError("trusted integration base/head authority is required");
  if (value.base !== authority.base || value.head !== authority.head) throw new TypeError("integration selection base/head mismatch");
  assertOwnership(authority.ownership);
  const ownership = normalizedOwnership(authority.ownership);
  if (value.ownershipId !== digest(ownership)) throw new TypeError("integration ownership identity mismatch");
  if (!["impact", "conservative", "exempt"].includes(value.mode)) throw new TypeError("unsupported integration selection mode");
  if (value.mode === "exempt") {
    if (!["docs-only", "version-only"].includes(value.exemption) || value.exemption !== authority.exemption) throw new TypeError("integration exemption lacks authority");
  } else if (value.exemption !== null || authority.exemption != null) throw new TypeError("unexpected integration exemption");
  if (!Array.isArray(value.owners) || value.owners.length !== ownership.owners.length) throw new TypeError("incomplete integration owner selection");
  for (const [index, owner] of ownership.owners.entries()) {
    const decision = value.owners[index];
    exactKeys(decision, ["owner", "cadence", "scopes", "targets", "selected", "reasons"], "owner decision");
    if (decision.owner !== owner.id || decision.cadence !== owner.cadence || !Array.isArray(decision.scopes) || decision.scopes.length !== owner.scopes.length
      || decision.scopes.some((scope, index) => scope !== owner.scopes[index])
      || !Array.isArray(decision.targets) || decision.targets.length !== owner.targets.length) throw new TypeError("integration owner or applicability mismatch");
    for (const [index, target] of decision.targets.entries()) {
      exactKeys(target, ["platform", "architecture", "node"], "selected target");
      if (["platform", "architecture", "node"].some(key => target[key] !== owner.targets[index][key])) throw new TypeError("integration target mismatch");
    }
    if (typeof decision.selected !== "boolean") throw new TypeError("integration decision requires explicit selection or exclusion");
    if (!Array.isArray(decision.reasons) || decision.reasons.length === 0 || decision.reasons.length > MAX_REASONS) throw new TypeError("integration reasons missing or unbounded");
    for (const reason of decision.reasons) {
      exactKeys(reason, ["code", "paths"], "reason");
      if (!(decision.selected ? SELECT_REASONS : EXCLUDE_REASONS).has(reason.code)) throw new TypeError("integration reason contradicts decision");
      if (!Array.isArray(reason.paths) || reason.paths.length > 16 || reason.paths.some(path => !repositoryPath(path))) throw new TypeError("integration reason paths invalid or unbounded");
      if (["coarse-owner", "changed-test", "shared-support", "invalidator"].includes(reason.code) && reason.paths.length === 0) throw new TypeError("integration impact reason requires a path");
      if (["docs-only", "version-only"].includes(reason.code) && (value.mode !== "exempt" || reason.code !== value.exemption)) throw new TypeError("integration exclusion exemption mismatch");
      if (reason.code === "exhaustive-cadence" && (owner.cadence !== "exhaustive" || value.mode === "exempt")) throw new TypeError("integration cadence deferral lacks exhaustive authority");
    }
    if (owner.cadence === "exhaustive" && value.mode !== "exempt"
      && (decision.selected || decision.reasons.some(reason => reason.code !== "exhaustive-cadence"))) {
      throw new TypeError("exhaustive integration owner requires explicit cadence deferral");
    }
    if (value.mode === "conservative" && owner.cadence === "pull-request" && !decision.selected) throw new TypeError("conservative selection must include every pull-request owner");
    if (value.mode === "exempt" && (decision.selected || decision.reasons.some(reason => reason.code !== value.exemption))) throw new TypeError("exempt selection must explicitly exclude every owner");
  }
}

/** Validate reviewed ownership, including explicit platform/runtime repetitions. */
function assertOwnership(ownership) {
  exactKeys(ownership, ["schema", "owners"], "ownership");
  if (ownership.schema !== "a1-integration-ownership-v2") throw new TypeError("unsupported integration ownership schema");
  if (!Array.isArray(ownership.owners) || ownership.owners.length === 0 || ownership.owners.length > MAX_OWNERS) throw new TypeError("integration ownership missing or unbounded");
  const ids = new Set();
  const executions = new Set();
  for (const owner of ownership.owners) {
    exactKeys(owner, ["id", "cadence", "scopes", "targets"], "owner");
    if (!identifier(owner.id) || ids.has(owner.id)) throw new TypeError("invalid or duplicate integration owner");
    ids.add(owner.id);
    if (!["pull-request", "exhaustive"].includes(owner.cadence)) throw new TypeError("integration owner requires supported cadence");
    if (!Array.isArray(owner.scopes) || owner.scopes.length === 0 || owner.scopes.length > MAX_SCOPES
      || owner.scopes.some(scope => !identifier(scope)) || new Set(owner.scopes).size !== owner.scopes.length) throw new TypeError("integration scopes invalid or unbounded");
    if (!Array.isArray(owner.targets) || owner.targets.length === 0 || owner.targets.length > 16) throw new TypeError("integration targets missing or unbounded");
    for (const target of owner.targets) {
      exactKeys(target, ["platform", "architecture", "node"], "target");
      if (!["win32", "linux", "darwin"].includes(target.platform) || !["x64", "arm64"].includes(target.architecture)
        || ![22, 24].includes(target.node)) throw new TypeError("unsupported integration platform/runtime");
      for (const scope of owner.scopes) {
        const key = `${scope}:${target.platform}:${target.architecture}:${target.node}`;
        if (executions.has(key)) throw new TypeError("duplicate integration scope on the same platform/runtime");
        executions.add(key);
      }
    }
  }
}

function normalizedOwnership(ownership) {
  return {
    schema: ownership.schema,
    owners: ownership.owners.map(owner => ({
      ...owner, scopes: [...owner.scopes].sort(), targets: owner.targets.map(target => ({ ...target })).sort((left, right) => canonical(left) < canonical(right) ? -1 : canonical(left) > canonical(right) ? 1 : 0),
    })).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  };
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) throw new TypeError(`invalid integration ${label} fields`);
}

function identifier(value) {
  return typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/u.test(value);
}

function repositoryPath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 1024
    && !/[\u0000-\u001f\u007f\\:]/u.test(value) && !value.startsWith("/")
    && value.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

function commit(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
