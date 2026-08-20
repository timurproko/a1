import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { listIdentitySurfaceFiles, scanLegacyIdentity } from "./product-identity-inventory.mjs";

const rootArgument = process.argv.indexOf("--root");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const inventoryPath = resolve(root, "config/product-identity-legacy-inventory.json");
const allowlistPath = resolve(root, "config/product-identity-legacy-allowlist.json");
const errors = [];

const [recorded, allowlist, identity, actual] = await Promise.all([
  readJson(inventoryPath, "legacy identity inventory"),
  readJson(allowlistPath, "legacy identity allowlist"),
  readJson(resolve(root, "src/product-identity.json"), "product identity authority"),
  scanLegacyIdentity(root),
]);

if (recorded && allowlist) {
  const { generatedAt: _generatedAt, ...recordedInventory } = recorded;
  if (JSON.stringify(recordedInventory) !== JSON.stringify(actual)) {
    errors.push("legacy identity inventory is stale; regenerate and review it before changing the allowlist");
  }
  if (allowlist.schema !== "a1-legacy-identity-allowlist-v1" || !Array.isArray(allowlist.occurrences)) {
    errors.push("legacy identity allowlist schema is invalid");
  } else {
    const approved = new Map(allowlist.occurrences.map(entry => [entry.id, entry]));
    for (const occurrence of actual.occurrences) {
      const entry = approved.get(occurrence.id);
      if (!entry) {
        errors.push(`${occurrence.id}: unapproved legacy identity occurrence`);
        continue;
      }
      if (entry.value !== occurrence.value || entry.fingerprint !== fingerprint(occurrence) || typeof entry.reason !== "string" || entry.reason.length < 8) {
        errors.push(`${occurrence.id}: legacy identity approval differs from the exact inventoried occurrence`);
      }
      approved.delete(occurrence.id);
    }
    for (const id of approved.keys()) errors.push(`${id}: stale legacy identity approval no longer matches an occurrence`);
  }
}

await inspectExecutableDuplicates();

if (errors.length > 0) {
  process.stderr.write(`Product identity governance failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Product identity governance OK: ${actual.occurrences.length} exact historical/rejection occurrences approved\n`);
}

async function inspectExecutableDuplicates() {
  for (const absolute of await listIdentitySurfaceFiles(root)) {
    const path = relative(root, absolute).split(sep).join("/");
    if (path === "src/product-identity.json" || path === "src/product-identity.ts" || path.startsWith("test/")
      || path.startsWith("openspec/") || path.startsWith("docs/") || path === "README.md") continue;
    if (!path.startsWith("src/") && !path.startsWith("scripts/") && !path.startsWith("bin/") && !path.startsWith(".github/")) continue;
    const source = await readFile(absolute, "utf8");
    if (identity && source.includes(identity.packageName)) errors.push(`${path}: duplicates the authoritative package name`);
    const assignment = /\b(?:PRODUCT|APPLICATION|APP|PACKAGE|DISPLAY|COMMAND|NAMESPACE|SCHEMA)[A-Z0-9_]*\s*=\s*["'](?:A1|a1)["']/g;
    for (const match of source.matchAll(assignment)) errors.push(`${path}: duplicates current identity in executable assignment: ${match[0]}`);
  }
}

async function readJson(path, name) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    errors.push(`${name} is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

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
