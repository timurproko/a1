import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractPiSettingsMetadata } from "./pi-settings-metadata.mjs";

/**
 * Generates the settings presentation A1 ships from the pinned engine's own source.
 * The build writes it beside the compiled settings bridge in `dist/`; the test run writes
 * it beside the source module so vitest reads the same file. Nothing is committed, so a
 * Pi bump cannot leave stale wording, order, or dialog contents behind.
 */

export const METADATA_FILE = "integrations/pi/engine/pi-settings-metadata.json";

export function renderMetadata() {
  return `${JSON.stringify(extractPiSettingsMetadata(), null, 2)}\n`;
}

/** Writes the metadata under `dist/` or `src/` and returns the repository-relative path. */
export function writePiSettingsMetadata(tree) {
  if (tree !== "dist" && tree !== "src") throw new Error(`unknown metadata tree: ${tree}`);
  const relative = `${tree}/${METADATA_FILE}`;
  const target = fileURLToPath(new URL(`../../${relative}`, import.meta.url));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderMetadata(), "utf8");
  return relative;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tree = process.argv.includes("--src") ? "src" : "dist";
  writePiSettingsMetadata(tree);
}
