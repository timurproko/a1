import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assertValidationImpact, selectValidationImpact } from "./validation-impact.mjs";
import { optionValue } from "../cli-options.mjs";

const repository = resolve(optionValue("--root") ?? process.cwd());
const output = optionValue("--output");
const selection = assertValidationImpact(await selectValidationImpact({
  repository,
  base: optionValue("--base"),
  head: optionValue("--head") ?? "HEAD",
  includeWorktree: process.argv.includes("--include-worktree"),
  manualNoComparison: process.argv.includes("--manual-no-comparison"),
  implementationBound: process.argv.includes("--implementation-bound"),
}));
const serialized = `${JSON.stringify(selection, null, 2)}\n`;
if (output) {
  const path = resolve(repository, output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serialized);
}
process.stdout.write(serialized);

