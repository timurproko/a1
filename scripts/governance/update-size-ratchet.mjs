/**
 * Lowers `config/baselines/size-ratchet.json` to what the tree measures: shrunk counts go down and
 * units that vanished or fell below every threshold are removed. It never adds or raises an entry;
 * growth is a reviewed hand edit. `--seed` creates the baseline from the current measurement and
 * refuses to overwrite an existing one; `--check` reports without writing.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { measureSizeRatchet, ratchetSizeBaseline } from "./size-ratchet-policy.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const seed = process.argv.includes("--seed");
const baselinePath = join(repository, "config", "baselines", "size-ratchet.json");

const existing = await readFile(baselinePath, "utf8").then(text => JSON.parse(text), error => {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
  throw error;
});
if (seed && existing) throw new Error("size ratchet baseline already exists; --seed only creates it");
if (!seed && !existing) throw new Error("size ratchet baseline is missing; create it with --seed");
const measured = await measureSizeRatchet(repository);
if (measured.errors.length > 0) throw new Error(measured.errors.join("; "));
const next = ratchetSizeBaseline(measured, existing, { seed });
const summary = `${Object.keys(next.classes).length} classes, ${Object.keys(next.functions).length} functions`;
if (JSON.stringify(next) === JSON.stringify(existing)) {
  console.log(`Size ratchet baseline is current (${summary})`);
} else if (checkOnly) {
  console.error(`size ratchet baseline can be lowered (${summary})`);
  process.exitCode = 1;
} else {
  await writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote config/baselines/size-ratchet.json (${summary})`);
}
