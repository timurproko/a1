import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const PUBLICATION_MODES = Object.freeze(["develop", "nightly", "stable"]);

export const PUBLICATION_VALIDATION_LANES = Object.freeze([
  Object.freeze({ platform: "win32-node24", os: "windows-2025", node: 24 }),
  Object.freeze({ platform: "linux-node24", os: "ubuntu-24.04", node: 24 }),
  Object.freeze({ platform: "darwin-node24", os: "macos-15", node: 24 }),
  Object.freeze({ platform: "win32-node22", os: "windows-2025", node: 22 }),
]);

/** Select the exact-package validation lanes for one publication mode. */
export function publicationValidationMatrix(mode) {
  if (!PUBLICATION_MODES.includes(mode)) throw new Error(`unknown publication mode: ${String(mode)}`);
  // Rationale: a numbered preview is superseded by the next merge and nightly validates the same
  // head on every lane within a day, so the preview skips the slower second Windows runtime.
  const lanes = mode === "develop" ? PUBLICATION_VALIDATION_LANES.filter(lane => lane.node === 24) : [...PUBLICATION_VALIDATION_LANES];
  return { include: lanes.map(lane => ({ ...lane })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--mode");
  const mode = index >= 0 ? process.argv[index + 1] : undefined;
  process.stdout.write(`${JSON.stringify(publicationValidationMatrix(mode))}\n`);
}
