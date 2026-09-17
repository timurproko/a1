import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertIntegrationSelection } from "./integration-selection.mjs";

const WINDOWS = { os: "windows-2025", platform: "win32", architecture: "x64", binary: "process-guardian.exe" };

/** Every Development modular job GitHub may schedule; the workflow takes its matrix from the active subset. */
export const DEVELOPMENT_VALIDATION_MATRIX = Object.freeze([
  { group: "core", label: "PR core and affected unit owners", ...WINDOWS, node: 24, build: true, guardian: true, defender: false },
  { group: "resource", label: "Resource-sensitive fast partition", ...WINDOWS, node: 24, build: true, guardian: false, defender: false },
  { group: "pi", label: "Pi release and resume integration", ...WINDOWS, node: 24, build: true, guardian: false, defender: false },
  { group: "promoted", label: "Changed full-only integration owners", ...WINDOWS, node: 24, build: true, guardian: false, defender: false },
  { group: "package", label: "Exact-package contracts", ...WINDOWS, node: 22, build: true, guardian: false, defender: false },
  { group: "startup", label: "First-attempt startup budget", ...WINDOWS, node: 22, build: true, guardian: false, defender: true },
  { group: "compatibility", label: "Image and history compatibility", ...WINDOWS, node: 22, build: true, guardian: false, defender: false },
  { group: "containment", label: "Unix integration (Linux)", os: "ubuntu-24.04", platform: "linux", architecture: "x64", node: 24, build: true, guardian: true, defender: false, binary: "process-guardian" },
  { group: "containment", label: "Unix integration (macOS)", os: "macos-15", platform: "darwin", architecture: "arm64", node: 24, build: true, guardian: true, defender: false, binary: "process-guardian" },
].map(entry => Object.freeze(entry)));

/** Map an integration owner to the modular job that executes it on a platform. */
export function validationJobGroup(owner, platform) {
  if (owner === "pi-release-resume") return "pi";
  if (["launch-integration", "update-performance", "structured-runtime", "update-predecessor"].includes(owner)) return "promoted";
  if (owner === "package-contracts") return "package";
  if (owner === "startup") return "startup";
  if (["image-compatibility", "history-compatibility"].includes(owner)) return platform === "win32" ? "compatibility" : "containment";
  if (owner === "unix-containment") return "containment";
  throw new Error(`unknown validation owner: ${owner}`);
}

/** Resolve one modular target's owners, scopes, and tests from the trusted impact selection. */
export function resolveValidationJob({ impact, registry, job, platform, architecture, node }) {
  const ownership = { schema: "a1-integration-ownership-v2", owners: registry.owners.map(({ id, cadence, scopes, targets }) => ({ id, cadence, scopes, targets })) };
  const selection = assertIntegrationSelection(impact.integration?.selection, { base: impact.base, head: impact.head, ownership, exemption: impact.integration?.selection?.exemption });
  const fixed = job === "core" ? ["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"]
    : job === "resource" ? ["pr-selected-resource"] : null;
  const tests = job === "core" ? impact.prCore.tests : job === "resource" ? impact.prCore.resourceTests : [];
  const ownerIds = fixed ? [job === "core" ? "pr-core" : "pr-resource"] : selection.owners
    .filter(owner => owner.selected && owner.targets.some(target => target.platform === platform && target.architecture === architecture && target.node === node)
      && validationJobGroup(owner.owner, platform) === job)
    .map(owner => owner.owner);
  const scopes = fixed ? fixed : [...new Set(selection.owners.filter(owner => ownerIds.includes(owner.owner)).flatMap(owner => owner.scopes))];
  const active = selection.mode !== "exempt" && scopes.length > 0 && (job !== "resource" || tests.length > 0);
  const deferredOwners = selection.owners.filter(owner => owner.cadence === "exhaustive" && !owner.selected).map(owner => owner.owner);
  return { schema: "a1-validation-job-selection-v3", head: impact.head, selectionId: impact.selectionId, job, platform, architecture, node, active, owners: ownerIds, deferredOwners, scopes, tests };
}

/** Split the declared matrix into entries the selection activates and entries it leaves idle. */
export function selectDevelopmentValidationMatrix({ impact, registry, matrix = DEVELOPMENT_VALIDATION_MATRIX }) {
  const include = [], inactive = [];
  for (const entry of matrix) {
    const resolved = resolveValidationJob({ impact, registry, job: entry.group, platform: entry.platform, architecture: entry.architecture, node: entry.node });
    (resolved.active ? include : inactive).push({ ...entry });
  }
  return { include, inactive };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const impact = JSON.parse(await readFile(resolve(valueAfter("--impact") ?? ".artifacts/validation/impact.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
  const { include, inactive } = selectDevelopmentValidationMatrix({ impact, registry });
  process.stdout.write(`${JSON.stringify({ include, inactive })}\n`);
  if (process.env.GITHUB_OUTPUT) {
    // Invariant: the matrix output carries only `include`; any other key would become a matrix vector.
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_OUTPUT, `modular_matrix=${JSON.stringify({ include })}\n`);
  }
}
function valueAfter(name) { const index = process.argv.indexOf(name); if (index < 0) return undefined; if (!process.argv[index + 1]) throw new Error(`${name} requires a value`); return process.argv[index + 1]; }
