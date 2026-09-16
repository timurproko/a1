import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertIntegrationSelection } from "./integration-selection.mjs";

const impact = JSON.parse(await readFile(resolve(valueAfter("--impact") ?? ".artifacts/validation/impact.json"), "utf8"));
const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
const job = valueAfter("--job"), platform = valueAfter("--platform"), architecture = valueAfter("--architecture"), node = Number(valueAfter("--node"));
const ownership = { schema: "a1-integration-ownership-v1", owners: registry.owners.map(({ id, scopes, targets, development }) => ({ id, scopes, targets, development })) };
const selection = assertIntegrationSelection(impact.integration?.selection, { base: impact.base, head: impact.head, ownership, exemption: impact.integration?.selection?.exemption });
const fixed = job === "core" ? ["typecheck", "architecture", "pr-core-tests", "pr-selected-tests"]
  : job === "resource" ? ["pr-selected-resource"] : null;
const tests = job === "core" ? impact.prCore.tests : job === "resource" ? impact.prCore.resourceTests : [];
const ownerIds = fixed ? [job === "core" ? "pr-core" : "pr-resource"] : selection.owners
  .filter(owner => owner.selected && owner.targets.some(target => target.platform === platform && target.architecture === architecture && target.node === node) && group(owner.owner, platform) === job)
  .map(owner => owner.owner);
const scopes = fixed ? fixed : [...new Set(selection.owners.filter(owner => ownerIds.includes(owner.owner)).flatMap(owner => owner.scopes))];
const active = selection.mode !== "exempt" && scopes.length > 0 && (job !== "resource" || tests.length > 0);
const result = { schema: "a1-validation-job-selection-v2", head: impact.head, selectionId: impact.selectionId, job, platform, architecture, node, active, owners: ownerIds, scopes, tests };
process.stdout.write(`${JSON.stringify(result)}\n`);
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `active=${active}\nhead=${impact.head}\nselection_id=${impact.selectionId}\nowners_json=${JSON.stringify(ownerIds)}\nscopes_json=${JSON.stringify(scopes)}\ntests_json=${JSON.stringify(tests)}\n`);
}
function group(owner, targetPlatform) {
  if (owner === "pi-release-resume") return "pi";
  if (["launch-integration", "update-performance", "structured-runtime", "update-predecessor"].includes(owner)) return "promoted";
  if (owner === "package-contracts") return "package";
  if (owner === "startup") return "startup";
  if (["image-compatibility", "history-compatibility"].includes(owner)) return targetPlatform === "win32" ? "compatibility" : "containment";
  if (owner === "unix-containment") return "containment";
  throw new Error(`unknown validation owner: ${owner}`);
}
function valueAfter(name) { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} requires a value`); return process.argv[index + 1]; }
