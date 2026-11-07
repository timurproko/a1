import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveValidationJob } from "./validation-matrix.mjs";

const impact = JSON.parse(await readFile(resolve(valueAfter("--impact") ?? ".artifacts/validation/impact.json"), "utf8"));
const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
const result = resolveValidationJob({ impact, registry, job: valueAfter("--job"), platform: valueAfter("--platform"),
  architecture: valueAfter("--architecture"), node: Number(valueAfter("--node")) });
process.stdout.write(`${JSON.stringify(result)}\n`);
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `active=${result.active}\nhead=${impact.head}\nselection_id=${impact.selectionId}\nowners_json=${JSON.stringify(result.owners)}\ndeferred_owners_json=${JSON.stringify(result.deferredOwners)}\nscopes_json=${JSON.stringify(result.scopes)}\ntests_json=${JSON.stringify(result.tests)}\n`);
}
function valueAfter(name) { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} requires a value`); return process.argv[index + 1]; }
