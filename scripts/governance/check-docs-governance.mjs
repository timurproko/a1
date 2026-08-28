import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scanLegacyIdentity } from "./product-identity-inventory.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const path = resolve(root, "config/product-identity-legacy-inventory.json");
const recorded = JSON.parse(await readFile(path, "utf8"));
const { generatedAt: _generatedAt, ...expected } = recorded;
const actual = await scanLegacyIdentity(root);
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  const expectedIds = new Set(expected.occurrences.map(value => value.id));
  const actualIds = new Set(actual.occurrences.map(value => value.id));
  const removed = [...expectedIds].filter(id => !actualIds.has(id)).slice(0, 20);
  const added = [...actualIds].filter(id => !expectedIds.has(id)).slice(0, 20);
  throw new Error(`docs-sensitive governance inventory is stale; expected=${expected.summary.total}; actual=${actual.summary.total}; removed=${removed.join(",") || "none"}; added=${added.join(",") || "none"}`);
}
console.log(`Docs-sensitive governance OK: ${actual.summary.total} inventoried legacy occurrences match.`);
