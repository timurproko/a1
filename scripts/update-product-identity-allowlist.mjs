import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const inventoryPath = new URL("../config/product-identity-legacy-inventory.json", import.meta.url);
const outputPath = new URL("../config/product-identity-legacy-allowlist.json", import.meta.url);
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const output = {
  schema: "a1-legacy-identity-allowlist-v1",
  generatedAt: new Date().toISOString(),
  inventorySchema: inventory.schema,
  occurrences: inventory.occurrences.map(occurrence => ({
    id: occurrence.id,
    value: occurrence.value,
    fingerprint: fingerprint(occurrence),
    reason: reason(occurrence),
  })),
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${output.occurrences.length} exact legacy identity approvals for review.\n`);

function fingerprint(occurrence) {
  return createHash("sha256").update(JSON.stringify({
    path: occurrence.path,
    locationKind: occurrence.locationKind,
    line: occurrence.line,
    column: occurrence.column,
    value: occurrence.value,
    context: occurrence.context,
    classes: occurrence.classes,
  })).digest("hex");
}

function reason(occurrence) {
  if (occurrence.classes.includes("historical-records")) return "exact historical evidence record";
  if (occurrence.classes.includes("explicit-obsolete-package-fixtures")) return "explicit obsolete-package rejection or deprecation fixture";
  if (occurrence.path.startsWith("openspec/changes/centralize-a1-product-identity/")) return "identity migration specification or closure task";
  if (occurrence.path === "docs/architecture/toolchain.md" || occurrence.path.endsWith("product-identity-documentation.test.ts")) {
    return "documented hard-cut or deprecation assertion";
  }
  if (occurrence.path.startsWith("test/")) return "explicit legacy rejection fixture";
  if (occurrence.path.startsWith("openspec/specs/")) return "obsolete-package rejection requirement";
  return "migration baseline pending final closure";
}
