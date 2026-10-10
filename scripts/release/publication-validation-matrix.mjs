import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { FULL_REGRESSION_SHARDS } from "./full-regression-shards.mjs";

export const PUBLICATION_MODES = Object.freeze(["develop", "nightly", "candidate", "stable"]);

export const PUBLICATION_VALIDATION_LANES = Object.freeze([
  Object.freeze({ platform: "win32-node24", os: "windows-2025", node: 24 }),
  Object.freeze({ platform: "linux-node24", os: "ubuntu-24.04", node: 24 }),
  Object.freeze({ platform: "darwin-node24", os: "macos-15", node: 24 }),
  Object.freeze({ platform: "win32-node22", os: "windows-2025", node: 22 }),
]);

function requireMode(mode) {
  if (!PUBLICATION_MODES.includes(mode)) throw new Error(`unknown publication mode: ${String(mode)}`);
}

/** Complete native lanes remain authoritative for published-pair smoke and platform coverage. */
export function publicationValidationMatrix(mode) {
  requireMode(mode);
  // Rationale: a numbered preview is superseded by the next merge and nightly validates the same
  // head on every lane within a day, so the preview skips the slower second Windows runtime.
  const lanes = mode === "develop" ? PUBLICATION_VALIDATION_LANES.filter(lane => lane.node === 24) : [...PUBLICATION_VALIDATION_LANES];
  return { include: lanes.map(lane => ({ ...lane })) };
}

/** Lanes that execute as one validation job rather than canonical Windows shards. */
export function publicationSequentialValidationMatrix(mode) {
  requireMode(mode);
  const complete = publicationValidationMatrix(mode).include;
  const lanes = mode === "nightly" || mode === "candidate" ? complete.filter(lane => lane.os !== "windows-2025") : complete;
  return { include: lanes };
}

/** Canonical Windows full-release shards; bounded development and adopted stable releases have none. */
export function publicationWindowsShardMatrix(mode) {
  requireMode(mode);
  if (mode !== "nightly" && mode !== "candidate") return { include: [] };
  const windows = publicationValidationMatrix(mode).include.filter(lane => lane.os === "windows-2025");
  return { include: windows.flatMap(lane => FULL_REGRESSION_SHARDS.map(shard => ({ ...lane, shard }))) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const modeIndex = process.argv.indexOf("--mode");
  const kindIndex = process.argv.indexOf("--kind");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined;
  const kind = kindIndex >= 0 ? process.argv[kindIndex + 1] : "complete";
  const matrix = kind === "complete" ? publicationValidationMatrix(mode)
    : kind === "sequential" ? publicationSequentialValidationMatrix(mode)
      : kind === "windows-shards" ? publicationWindowsShardMatrix(mode)
        : (() => { throw new Error(`unknown publication matrix kind: ${String(kind)}`); })();
  process.stdout.write(`${JSON.stringify(matrix)}\n`);
}
