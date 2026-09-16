import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadValidationOwnership } from "./validation-ownership.mjs";

const repository = process.cwd();
const output = resolve(valueAfter("--output") ?? ".artifacts/validation/ownership-ledger.json");
const authority = await loadValidationOwnership(repository);
const integration = JSON.parse(await readFile(resolve(repository, "config/integration-owners.json"), "utf8"));
const integrationTests = new Map();
for (const owner of integration.owners) for (const test of owner.tests) {
  const targets = integrationTests.get(test) ?? [];
  targets.push(...owner.targets.map(target => ({ owner: owner.id, ...target })));
  integrationTests.set(test, targets);
}
const tests = authority.ledger.map(entry => ({ ...entry, integrationTargets: integrationTests.get(entry.test) ?? [] }));
const unaccounted = tests.filter(test => !test.fastOwner && test.completeOwners.length === 0 && test.integrationTargets.length === 0);
if (unaccounted.length > 0) throw new Error(`retained tests lack complete cadence: ${unaccounted.map(test => test.test).join(", ")}`);
const report = {
  schema: "a1-validation-ownership-ledger-v2",
  policyId: authority.policyId,
  retainedTests: tests.length,
  prCoreTests: tests.filter(test => test.prCore).length,
  fastRemainderTests: tests.filter(test => test.fastOwner === "fast-remainder").length,
  resourceSensitiveTests: tests.filter(test => test.fastOwner === "fast-resource-sensitive").length,
  integrationTargetExecutions: tests.reduce((total, test) => total + test.integrationTargets.length, 0),
  owners: authority.policy.owners.map(owner => ({ id: owner.id, tests: tests.filter(test => test.owner === owner.id).length,
    integrationOwners: owner.integrationOwners })),
  tests,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, retainedTests: report.retainedTests, policyId: report.policyId })}\n`);
function valueAfter(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
