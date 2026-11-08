import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertIntegrationSelection } from "./integration-selection.mjs";
import { optionValue } from "../cli-options.mjs";

const WINDOWS = { os: "windows-2025", platform: "win32", architecture: "x64" };
const LINUX = { os: "ubuntu-24.04", platform: "linux", architecture: "x64" };
// Rationale: pin Development to the current GA Apple Silicon image independently of the
// macOS 15 Full/publication baseline; repeated macOS 15 allocation failures ran no tests.
const DARWIN = { os: "macos-26", platform: "darwin", architecture: "arm64" };

/** Every Development modular job GitHub may schedule; the workflow takes its matrix from the active subset. */
export const DEVELOPMENT_VALIDATION_MATRIX = Object.freeze([
  { group: "core", label: "PR core and affected unit owners", ...WINDOWS, node: 24, build: true, defender: false },
  { group: "resource", label: "Resource-sensitive fast partition", ...WINDOWS, node: 24, build: true, defender: false },
  { group: "pi", label: "Pi release and resume integration", ...WINDOWS, node: 24, build: true, defender: false },
  { group: "promoted", label: "Changed full-only integration owners", ...WINDOWS, node: 24, build: true, defender: false },
  { group: "package", label: "Exact-package contracts", ...WINDOWS, node: 22, build: true, defender: false },
  { group: "startup", label: "First-attempt startup budget", ...WINDOWS, node: 22, build: true, defender: true },
  { group: "compatibility", label: "Image and history compatibility", ...WINDOWS, node: 22, build: true, defender: false },
  { group: "unix", label: "Unix integration (Linux)", ...LINUX, node: 24, build: true, defender: false },
  { group: "unix", label: "Unix integration (macOS)", ...DARWIN, node: 24, build: true, defender: false },
].map(entry => Object.freeze(entry)));

/** Map an integration owner to the modular job that executes it on a platform. */
export function validationJobGroup(owner, platform) {
  if (owner === "pi-release-resume") return "pi";
  if (owner === "update-predecessor") return platform === "win32" ? "promoted" : "unix";
  if (["launch-integration", "update-performance"].includes(owner)) return "promoted";
  if (owner === "package-contracts") return "package";
  if (owner === "startup") return "startup";
  if (["image-compatibility", "history-compatibility"].includes(owner)) return platform === "win32" ? "compatibility" : "unix";
  if (owner === "unix-release") return "unix";
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
  const impact = JSON.parse(await readFile(resolve(optionValue("--impact") ?? ".artifacts/validation/impact.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
  const { include, inactive } = selectDevelopmentValidationMatrix({ impact, registry });
  process.stdout.write(`${JSON.stringify({ include, inactive })}\n`);
  if (process.env.GITHUB_OUTPUT) {
    // Invariant: the matrix output carries only `include`; any other key would become a matrix vector.
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_OUTPUT, `modular_matrix=${JSON.stringify({ include })}\n`);
  }
}
