import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveValidationJob } from "./validation-matrix.mjs";
import { optionValue } from "../cli-options.mjs";

const impact = JSON.parse(await readFile(resolve(optionValue("--impact") ?? ".artifacts/validation/impact.json"), "utf8"));
const registry = JSON.parse(await readFile(resolve("config/integration-owners.json"), "utf8"));
const result = resolveValidationJob({ impact, registry, job: optionValue("--job", { required: true }), platform: optionValue("--platform", { required: true }),
  architecture: optionValue("--architecture", { required: true }), node: Number(optionValue("--node", { required: true })) });
process.stdout.write(`${JSON.stringify(result)}\n`);
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `active=${result.active}\nhead=${impact.head}\nselection_id=${impact.selectionId}\nowners_json=${JSON.stringify(result.owners)}\ndeferred_owners_json=${JSON.stringify(result.deferredOwners)}\nscopes_json=${JSON.stringify(result.scopes)}\ntests_json=${JSON.stringify(result.tests)}\n`);
}
