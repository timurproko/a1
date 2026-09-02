import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assertValidationImpact, selectValidationImpact } from "./validation-impact.mjs";

const repository = resolve(valueAfter("--root") ?? process.cwd());
const output = valueAfter("--output");
const selection = assertValidationImpact(await selectValidationImpact({
  repository,
  base: valueAfter("--base"),
  head: valueAfter("--head") ?? "HEAD",
  includeWorktree: process.argv.includes("--include-worktree"),
}));
const serialized = `${JSON.stringify(selection, null, 2)}\n`;
if (output) {
  const path = resolve(repository, output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serialized);
}
process.stdout.write(serialized);

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}
