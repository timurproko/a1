import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { formatImpactSummary, selectGitImpact } from "./validation-impact.mjs";

const base = valueAfter("--base");
const head = valueAfter("--head");
const plan = await selectGitImpact({ base, head, full: process.argv.includes("--full") });
const json = `${JSON.stringify(plan, null, 2)}\n`;
const summary = formatImpactSummary(plan);

const output = valueAfter("--output");
if (output) {
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(resolve(output), json);
} else {
  process.stdout.write(json);
}

const summaryPath = valueAfter("--summary") ?? process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) await appendFile(resolve(summaryPath), summary);
const githubOutput = valueAfter("--github-output") ?? process.env.GITHUB_OUTPUT;
if (githubOutput) {
  await appendFile(resolve(githubOutput), [
    `selected=${JSON.stringify(plan.selected)}`,
    `full=${plan.full}`,
    `package_sensitive=${plan.packageSensitive}`,
    `changed_tests=${JSON.stringify(plan.changedTests)}`,
  ].join("\n") + "\n");
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
